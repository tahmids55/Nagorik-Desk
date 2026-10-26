import type { Lang } from "@/lib/constants";

export type Section = { title: string; body: string[] };
export type Page = { title: string; intro?: string; draft?: boolean; sections: Section[] };

/**
 * About, Terms and Privacy text.
 * The Terms and Privacy pages are plain-language DRAFTS and must be reviewed by a lawyer before launch (see OPEN_ITEMS.md).
 */
export const PAGES: Record<"about" | "terms" | "privacy", Record<Lang, Page>> = {
  about: {
    en: {
      title: "About Nagorik Desk",
      intro: "Nagorik Desk is a public place where people of Panchagarh-1 report local problems, support each other's reports, and hold the responsible offices to account.",
      sections: [
        {
          title: "How it works",
          body: [
            "1. Anyone with an account reports a problem with a photo and a pin on the map.",
            "2. Neighbours upvote the problems that affect them too, and downvote reports that are wrong or not a public matter. One vote per person.",
            "3. The office of the Member of Parliament reviews reports, assigns each one to the government office responsible for that area, and sets a deadline.",
            "4. The responsible office updates progress and uploads a photo as proof when the work is done. The person who reported it confirms the fix, or says it is still a problem.",
          ],
        },
        {
          title: "Open and accountable",
          body: [
            "Every status change, assignment, deadline and official reply is shown publicly on the report. The Accountability page shows, for every office, how many issues were assigned, solved and overdue, and how many days it took.",
            "The MP office can assign and respond, but cannot hide reports. Platform administrators can hide content that breaks the rules, but cannot assign work or change a status. Every staff action is recorded in an audit log.",
          ],
        },
        {
          title: "Verification (beta)",
          body: [
            "Email, mobile and National ID verification are being introduced step by step. Until a verification service is switched on, the site tells you honestly what is verified and what is not. We never ask for your National ID number until an authorised verification provider is connected.",
          ],
        },
        { title: "In an emergency", body: ["If someone is in danger, call 999 first. This website is not an emergency service."] },
      ],
    },
    bn: {
      title: "নাগরিক ডেস্ক সম্পর্কে",
      intro: "নাগরিক ডেস্ক এমন একটি উন্মুক্ত প্ল্যাটফর্ম, যেখানে পঞ্চগড়-১ এর মানুষ এলাকার সমস্যা জানান, একে অপরের অভিযোগে সমর্থন দেন এবং দায়িত্বপ্রাপ্ত দপ্তরের জবাবদিহি নিশ্চিত করেন।",
      sections: [
        {
          title: "কীভাবে কাজ করে",
          body: [
            "১. অ্যাকাউন্ট থাকলে যে কেউ ছবি ও মানচিত্রে পিন দিয়ে সমস্যা জানাতে পারেন।",
            "২. প্রতিবেশীরা যে সমস্যা তাঁদেরও, সেটিতে আপভোট দেন; ভুল বা সরকারি বিষয় নয় এমন অভিযোগে ডাউনভোট দেন। প্রত্যেকে একটি ভোট দিতে পারেন।",
            "৩. সংসদ সদস্যের কার্যালয় অভিযোগ যাচাই করে, সংশ্লিষ্ট এলাকার দায়িত্বপ্রাপ্ত সরকারি দপ্তরকে দায়িত্ব দেয় এবং সময়সীমা ঠিক করে।",
            "৪. দায়িত্বপ্রাপ্ত দপ্তর অগ্রগতি জানায় এবং কাজ শেষে প্রমাণ হিসেবে ছবি দেয়। যিনি অভিযোগ করেছেন তিনি সমাধান নিশ্চিত করেন, অথবা জানান যে সমস্যা এখনও আছে।",
          ],
        },
        {
          title: "উন্মুক্ত ও জবাবদিহিমূলক",
          body: [
            "প্রতিটি অবস্থার পরিবর্তন, দায়িত্ব বণ্টন, সময়সীমা ও সরকারি জবাব অভিযোগের পাতায় সবার জন্য দৃশ্যমান। জবাবদিহি পাতায় প্রতিটি দপ্তরের কতগুলো অভিযোগ ছিল, কতগুলো সমাধান হয়েছে, কতগুলো সময়সীমা পেরিয়েছে এবং কত দিন লেগেছে তা দেখানো হয়।",
            "সংসদ সদস্যের কার্যালয় দায়িত্ব দিতে ও জবাব দিতে পারে, কিন্তু কোনো অভিযোগ লুকাতে পারে না। প্ল্যাটফর্ম অ্যাডমিন নিয়মভঙ্গকারী বিষয়বস্তু লুকাতে পারেন, কিন্তু কাজের দায়িত্ব দিতে বা অবস্থা বদলাতে পারেন না। কর্মীদের প্রতিটি কাজ অডিট লগে লেখা থাকে।",
          ],
        },
        {
          title: "যাচাইকরণ (বিটা)",
          body: [
            "ইমেইল, মোবাইল ও জাতীয় পরিচয়পত্র যাচাই ধাপে ধাপে চালু হচ্ছে। যাচাই সেবা চালু না হওয়া পর্যন্ত কোনটি যাচাই হয়েছে আর কোনটি হয়নি, সাইট তা সততার সঙ্গে জানাবে। অনুমোদিত যাচাই সেবাদাতা যুক্ত না হওয়া পর্যন্ত আমরা কখনো আপনার জাতীয় পরিচয়পত্র নম্বর চাইব না।",
          ],
        },
        { title: "জরুরি অবস্থায়", body: ["কেউ বিপদে থাকলে আগে ৯৯৯ নম্বরে কল করুন। এই ওয়েবসাইট জরুরি সেবা নয়।"] },
      ],
    },
  },
  terms: {
    en: {
      title: "Terms of use",
      draft: true,
      intro: "Draft: these terms are written in plain language and need legal review before launch.",
      sections: [
        { title: "Your account", body: ["You must give your real name and a working email address. One person, one account. Keep your password private. You are responsible for what is posted from your account."] },
        { title: "What you may post", body: ["Post real local problems that a public office can act on. Describe the problem, not a person. Do not post other people's private information, hate, threats, spam, or anything false. Posts that break these rules may be hidden by moderators and accounts may be suspended."] },
        { title: "Voting", body: ["You may support or oppose a report once. Do not create several accounts, buy or sell votes, or organise fake support. Suspicious voting may be removed."] },
        { title: "Official responses", body: ["Assignments, deadlines and replies from the MP office and government offices are public. They are statements of those offices, not of Nagorik Desk."] },
        { title: "Emergencies", body: ["This site is not monitored for emergencies. Call 999."] },
        { title: "Changes", body: ["We may update these terms. If the changes are important, we will ask you to accept them again."] },
      ],
    },
    bn: {
      title: "ব্যবহারের শর্তাবলি",
      draft: true,
      intro: "খসড়া: এই শর্তাবলি সহজ ভাষায় লেখা এবং চালুর আগে আইনি পর্যালোচনা প্রয়োজন।",
      sections: [
        { title: "আপনার অ্যাকাউন্ট", body: ["আপনার প্রকৃত নাম ও সচল ইমেইল ঠিকানা দিতে হবে। এক ব্যক্তি, এক অ্যাকাউন্ট। পাসওয়ার্ড গোপন রাখুন। আপনার অ্যাকাউন্ট থেকে যা পোস্ট হয় তার দায় আপনার।"] },
        { title: "যা পোস্ট করতে পারবেন", body: ["সরকারি দপ্তর যেসব স্থানীয় সমস্যার সমাধান করতে পারে, সেগুলো জানান। সমস্যার বর্ণনা দিন, কোনো ব্যক্তির নয়। অন্যের ব্যক্তিগত তথ্য, ঘৃণা, হুমকি, স্প্যাম বা মিথ্যা তথ্য দেবেন না। নিয়ম ভাঙলে পোস্ট লুকানো এবং অ্যাকাউন্ট স্থগিত করা হতে পারে।"] },
        { title: "ভোট", body: ["একটি অভিযোগে আপনি একবারই সমর্থন বা বিরোধিতা করতে পারবেন। একাধিক অ্যাকাউন্ট খোলা, ভোট কেনাবেচা বা ভুয়া সমর্থন সংগঠিত করা যাবে না। সন্দেহজনক ভোট বাদ দেওয়া হতে পারে।"] },
        { title: "সরকারি জবাব", body: ["সংসদ সদস্যের কার্যালয় ও সরকারি দপ্তরের দায়িত্ব বণ্টন, সময়সীমা ও জবাব প্রকাশ্য। এগুলো ওই দপ্তরগুলোর বক্তব্য, নাগরিক ডেস্ক-এর নয়।"] },
        { title: "জরুরি অবস্থা", body: ["এই সাইট জরুরি সেবার জন্য নজরে রাখা হয় না। ৯৯৯ নম্বরে কল করুন।"] },
        { title: "পরিবর্তন", body: ["আমরা শর্তাবলি হালনাগাদ করতে পারি। গুরুত্বপূর্ণ পরিবর্তন হলে আপনাকে আবার সম্মতি দিতে বলা হবে।"] },
      ],
    },
  },
  privacy: {
    en: {
      title: "Privacy",
      draft: true,
      intro: "Draft: plain-language summary of how we handle your data. It needs legal review before launch.",
      sections: [
        { title: "What we store", body: ["Your name, email, password (as a one-way hash, never the password itself), the area you live in, and what you post: reports, votes, comments and photos. Mobile number is stored only if you verify it."] },
        { title: "What is public", body: ["Your name, photo, area and the reports you post are public, except reports you post anonymously: those show no name to the public. Moderators and the MP office can see who posted an anonymous report so they can follow up and stop abuse."] },
        { title: "Photos", body: ["Photos are resized and all hidden location data is removed from the file before it is stored. Add the location with the map pin instead."] },
        { title: "National ID", body: ["We do not ask for or store your National ID number. If verification is added, it will be done through an authorised provider and we will store only an irreversible code, never the number."] },
        { title: "What we never do", body: ["We do not sell your data and we use no advertising trackers."] },
        { title: "Your choices", body: ["You can edit your profile at any time, and delete your account in Settings. Deleting removes your name, email, mobile and photo. Reports and votes stay as an anonymous civic record."] },
      ],
    },
    bn: {
      title: "গোপনীয়তা",
      draft: true,
      intro: "খসড়া: আপনার তথ্য আমরা কীভাবে সামলাই তার সহজ ভাষার সারসংক্ষেপ। চালুর আগে আইনি পর্যালোচনা প্রয়োজন।",
      sections: [
        { title: "আমরা কী সংরক্ষণ করি", body: ["আপনার নাম, ইমেইল, পাসওয়ার্ড (একমুখী হ্যাশ হিসেবে, মূল পাসওয়ার্ড নয়), আপনার এলাকা এবং আপনার পোস্ট: অভিযোগ, ভোট, মন্তব্য ও ছবি। মোবাইল নম্বর যাচাই করলেই কেবল সংরক্ষিত হয়।"] },
        { title: "কোনটি প্রকাশ্য", body: ["আপনার নাম, ছবি, এলাকা ও আপনার পোস্ট করা অভিযোগ প্রকাশ্য। তবে নাম গোপন রেখে করা অভিযোগে জনসাধারণ নাম দেখে না। ফলোআপ ও অপব্যবহার ঠেকাতে মডারেটর ও সংসদ সদস্যের কার্যালয় দেখতে পারে কে পোস্ট করেছেন।"] },
        { title: "ছবি", body: ["সংরক্ষণের আগে ছবির আকার ছোট করা হয় এবং ছবির ভেতরের গোপন অবস্থান-তথ্য মুছে ফেলা হয়। অবস্থান জানাতে মানচিত্রে পিন ব্যবহার করুন।"] },
        { title: "জাতীয় পরিচয়পত্র", body: ["আমরা আপনার জাতীয় পরিচয়পত্র নম্বর চাই না বা সংরক্ষণ করি না। যাচাই যুক্ত হলে তা অনুমোদিত সেবাদাতার মাধ্যমে হবে এবং আমরা কেবল একটি অপরিবর্তনীয় কোড রাখব, নম্বর নয়।"] },
        { title: "আমরা যা কখনো করি না", body: ["আমরা আপনার তথ্য বিক্রি করি না এবং কোনো বিজ্ঞাপন-ট্র্যাকার ব্যবহার করি না।"] },
        { title: "আপনার পছন্দ", body: ["যে কোনো সময় প্রোফাইল সম্পাদনা এবং সেটিংসে গিয়ে অ্যাকাউন্ট মুছতে পারেন। মুছলে আপনার নাম, ইমেইল, মোবাইল ও ছবি সরে যায়। অভিযোগ ও ভোট নামহীন নাগরিক রেকর্ড হিসেবে থাকে।"] },
      ],
    },
  },
};
