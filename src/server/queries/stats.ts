import "server-only";
import { sql } from "drizzle-orm";
import { db } from "../db/client";

const visible = sql`i.hidden_at is null`;
const overdueSql = sql`(i.status in ('assigned','in_progress') and i.due_at < now())`;

export type Overview = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  overdue: number;
  medianDaysToResolve: number | null;
  createdLast30: number;
  resolvedLast30: number;
  updatedAt: string;
};

export async function getOverview(): Promise<Overview> {
  const res = await db().execute(sql`
    select
      count(*)::int as total,
      (count(*) filter (where i.status in ('open','under_review')))::int as open,
      (count(*) filter (where i.status in ('assigned','in_progress')))::int as in_progress,
      (count(*) filter (where i.status = 'resolved'))::int as resolved,
      (count(*) filter (where i.status = 'rejected'))::int as rejected,
      (count(*) filter (where ${overdueSql}))::int as overdue,
      (percentile_cont(0.5) within group (order by extract(epoch from (i.resolved_at - i.created_at)) / 86400.0)
        filter (where i.status = 'resolved' and i.resolved_at is not null)) as median_days,
      (count(*) filter (where i.created_at > now() - interval '30 days'))::int as created_30,
      (count(*) filter (where i.status = 'resolved' and i.resolved_at > now() - interval '30 days'))::int as resolved_30
    from nagorik_pg.issues i where ${visible}`);
  const r = res.rows[0] as Record<string, number | string | null>;
  return {
    total: Number(r.total),
    open: Number(r.open),
    inProgress: Number(r.in_progress),
    resolved: Number(r.resolved),
    rejected: Number(r.rejected),
    overdue: Number(r.overdue),
    medianDaysToResolve: r.median_days === null ? null : Math.round(Number(r.median_days) * 10) / 10,
    createdLast30: Number(r.created_30),
    resolvedLast30: Number(r.resolved_30),
    updatedAt: new Date().toISOString(),
  };
}

export type GroupRow = { key: string; total: number; resolved: number; open: number; active: number; overdue: number };

async function groupBy(column: "upazila_id" | "category_id"): Promise<GroupRow[]> {
  const col = sql.raw(`i.${column}`);
  const res = await db().execute(sql`
    select ${col} as key,
      count(*)::int as total,
      (count(*) filter (where i.status = 'resolved'))::int as resolved,
      (count(*) filter (where i.status in ('open','under_review')))::int as open,
      (count(*) filter (where i.status in ('assigned','in_progress')))::int as active,
      (count(*) filter (where ${overdueSql}))::int as overdue
    from nagorik_pg.issues i where ${visible} and i.status <> 'rejected'
    group by 1 order by total desc`);
  return res.rows.map((r) => ({ key: String(r.key), total: Number(r.total), resolved: Number(r.resolved), open: Number(r.open), active: Number(r.active), overdue: Number(r.overdue) }));
}

export const byUpazila = () => groupBy("upazila_id");
export const byCategory = () => groupBy("category_id");

export type StakeholderRow = {
  id: string;
  nameEn: string;
  nameBn: string | null;
  assigned: number;
  resolved: number;
  overdue: number;
  medianDays: number | null;
  acknowledgedInTime: number;
  reopened: number;
};

/** Office-level performance (never individual officials). Counts every issue ever assigned to the office. */
export async function byStakeholder(): Promise<StakeholderRow[]> {
  const res = await db().execute(sql`
    select s.id, s.name_en, s.name_bn,
      count(i.id)::int as assigned,
      (count(i.id) filter (where i.status = 'resolved'))::int as resolved,
      (count(i.id) filter (where ${overdueSql}))::int as overdue,
      (percentile_cont(0.5) within group (order by extract(epoch from (i.resolved_at - i.assigned_at)) / 86400.0)
        filter (where i.status = 'resolved' and i.resolved_at is not null and i.assigned_at is not null)) as median_days,
      (count(i.id) filter (where i.acknowledged_at is not null and i.assigned_at is not null and i.acknowledged_at - i.assigned_at <= interval '48 hours'))::int as ack_in_time,
      (count(i.id) filter (where i.reopen_count > 0))::int as reopened
    from nagorik_pg.stakeholders s
    left join nagorik_pg.issues i on i.stakeholder_id = s.id and ${visible}
    where s.active
    group by s.id order by assigned desc, s.name_en asc`);
  return res.rows.map((r) => ({
    id: String(r.id),
    nameEn: String(r.name_en),
    nameBn: r.name_bn === null ? null : String(r.name_bn),
    assigned: Number(r.assigned),
    resolved: Number(r.resolved),
    overdue: Number(r.overdue),
    medianDays: r.median_days === null ? null : Math.round(Number(r.median_days) * 10) / 10,
    acknowledgedInTime: Number(r.ack_in_time),
    reopened: Number(r.reopened),
  }));
}

export type PriorityRow = { id: string; title: string; status: string; commitment: string | null; targetDate: string | null; pastTarget: boolean; upazilaId: string };

/** Issues the MP has personally committed to (public). */
export async function priorities(): Promise<PriorityRow[]> {
  const res = await db().execute(sql`
    select i.id, i.title, i.status, i.mp_commitment, i.mp_target_date::text as target, i.upazila_id,
      (i.status <> 'resolved' and i.mp_target_date < (now() at time zone 'Asia/Dhaka')::date) as past_target
    from nagorik_pg.issues i
    where ${visible} and i.mp_priority
    order by (i.status = 'resolved') asc, i.mp_target_date asc nulls last limit 20`);
  return res.rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    status: String(r.status),
    commitment: r.mp_commitment === null ? null : String(r.mp_commitment),
    targetDate: r.target === null ? null : String(r.target),
    pastTarget: Boolean(r.past_target),
    upazilaId: String(r.upazila_id),
  }));
}

export type FixedRow = { id: string; title: string; resolvedAt: string; days: number; upazilaId: string; stakeholderId: string | null };

export async function recentlyResolved(limit = 6): Promise<FixedRow[]> {
  const res = await db().execute(sql`
    select i.id, i.title, i.resolved_at, i.upazila_id, i.stakeholder_id,
      round((extract(epoch from (i.resolved_at - i.created_at)) / 86400.0)::numeric, 1) as days
    from nagorik_pg.issues i
    where ${visible} and i.status = 'resolved' and i.resolved_at is not null
    order by i.resolved_at desc limit ${limit}`);
  return res.rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    resolvedAt: new Date(r.resolved_at as string).toISOString(),
    days: Number(r.days),
    upazilaId: String(r.upazila_id),
    stakeholderId: r.stakeholder_id === null ? null : String(r.stakeholder_id),
  }));
}

/** Six-month trend: reported vs resolved per month (Asia/Dhaka). */
export async function monthlyTrend(): Promise<{ month: string; reported: number; resolved: number }[]> {
  const res = await db().execute(sql`
    with months as (
      select generate_series(date_trunc('month', (now() at time zone 'Asia/Dhaka')) - interval '5 months', date_trunc('month', (now() at time zone 'Asia/Dhaka')), interval '1 month') as m
    )
    select to_char(m.m, 'YYYY-MM') as month,
      (select count(*)::int from nagorik_pg.issues i where i.hidden_at is null and date_trunc('month', i.created_at at time zone 'Asia/Dhaka') = m.m) as reported,
      (select count(*)::int from nagorik_pg.issues i where i.hidden_at is null and i.resolved_at is not null and date_trunc('month', i.resolved_at at time zone 'Asia/Dhaka') = m.m) as resolved
    from months m order by m.m`);
  return res.rows.map((r) => ({ month: String(r.month), reported: Number(r.reported), resolved: Number(r.resolved) }));
}
