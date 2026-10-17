/**
 * Demo data for presentations and local development.
 *
 *   npm run seed --workspace server
 *
 * Everything it creates uses @example.com addresses, and a re-run first removes
 * exactly that data, so real accounts are never touched. Every demo account
 * signs in with DEMO_PASSWORD. Refuses to run with NODE_ENV=production.
 */

import { randomBytes, randomUUID } from "node:crypto";

import mongoose, { type HydratedDocument, type Types } from "mongoose";

import {
  AssistantConversation,
  ContactSubmission,
  SupportChat,
  Task,
  User,
  type ISupportChat,
  type IUser,
  type TaskPriority,
  type TaskStatus,
} from "#models";
import { CHAT_WELCOME_SENDER, chatWelcomeMessage, deleteUserAccount } from "#services";

const DEMO_PASSWORD = "KarinoDemo1";
const DEMO_DOMAIN = /@example\.com$/i;

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed demo data with NODE_ENV=production.");
  process.exit(1);
}

// ---- time helpers --------------------------------------------------------
const DAY = 24 * 60 * 60 * 1000;
const at = (days: number, hour = 10, minute = 0): Date => {
  const date = new Date(Date.now() + days * DAY);
  date.setHours(hour, minute, 0, 0);
  return date;
};
const minutesAfter = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60 * 1000);

// ---- users ---------------------------------------------------------------
// No demo super admin: the only one is the owner's account (SUPER_ADMIN_EMAIL).
type Role = "user" | "admin";
const people: Array<{
  key: string;
  first: string;
  last: string;
  role: Role;
  joined: number;
}> = [
  { key: "olivia", first: "Olivia", last: "Bennett", role: "admin", joined: -120 },
  { key: "sarah", first: "Sarah", last: "Klein", role: "admin", joined: -95 },
  { key: "marco", first: "Marco", last: "Rossi", role: "admin", joined: -80 },
  { key: "lena", first: "Lena", last: "Wagner", role: "user", joined: -60 },
  { key: "james", first: "James", last: "Carter", role: "user", joined: -52 },
  { key: "aylin", first: "Aylin", last: "Demir", role: "user", joined: -41 },
  { key: "noah", first: "Noah", last: "Fischer", role: "user", joined: -33 },
  { key: "emma", first: "Emma", last: "Brown", role: "user", joined: -21 },
  { key: "lucas", first: "Lucas", last: "Martin", role: "user", joined: -12 },
  { key: "mia", first: "Mia", last: "Schneider", role: "user", joined: -7 },
];

// ---- tasks ---------------------------------------------------------------
// [title, description, priority, status, due (days from now, null = none), completed (days ago)]
type TaskSeed = [string, string, TaskPriority, TaskStatus, number | null, number?];
const tasksByUser: Record<string, TaskSeed[]> = {
  olivia: [
    [
      "Review quarterly access audit",
      "Check admin roles and remove stale accounts.",
      "high",
      "in-progress",
      1,
    ],
    ["Approve support escalation policy", "", "medium", "todo", 3],
    [
      "Rotate API credentials",
      "Coordinate with the infrastructure team.",
      "high",
      "done",
      null,
      2,
    ],
  ],
  sarah: [
    [
      "Answer open contact requests",
      "Two requests are waiting longer than 24 hours.",
      "high",
      "todo",
      0,
    ],
    ["Write onboarding guide for new staff", "", "medium", "in-progress", 4],
    ["Clean up duplicate user reports", "", "low", "done", null, 1],
    [
      "Prepare weekly support summary",
      "Numbers for Monday's sync.",
      "medium",
      "done",
      null,
      4,
    ],
  ],
  marco: [
    ["Review ban appeals", "Mia Schneider asked for a second review.", "high", "todo", 1],
    ["Translate help texts to German", "", "medium", "in-progress", 5],
    ["Update FAQ for password resets", "", "low", "done", null, 3],
  ],
  lena: [
    [
      "Steuerunterlagen sortieren",
      "Belege aus 2025 in Ordnern ablegen.",
      "high",
      "todo",
      -2,
    ],
    [
      "Präsentation für Kundentermin",
      "Folien zu den neuen Funktionen.",
      "high",
      "in-progress",
      0,
    ],
    ["Zahnarzttermin vereinbaren", "", "medium", "todo", 2],
    [
      "Wohnungsbesichtigung vorbereiten",
      "Fragen an den Vermieter notieren.",
      "medium",
      "todo",
      5,
    ],
    ["Bücher in die Bibliothek zurückbringen", "", "low", "done", null, 1],
    ["Fahrrad zur Inspektion bringen", "", "low", "done", null, 3],
    ["Geburtstagsgeschenk für Paul", "", "medium", "done", null, 5],
  ],
  james: [
    [
      "Prepare client demo",
      "Walk through the new dashboard and AI assistant.",
      "high",
      "in-progress",
      0,
    ],
    ["Send invoice to Northwind", "Invoice #2041, due last week.", "high", "todo", -3],
    ["Review pull requests", "", "medium", "todo", 1],
    ["Plan Q4 roadmap", "Collect input from the team first.", "medium", "todo", 6],
    ["Book flights for Berlin conference", "", "low", "todo", null],
    ["Fix login redirect bug", "", "high", "done", null, 0],
    ["Update onboarding docs", "", "medium", "done", null, 2],
    ["Renew domain certificate", "", "high", "done", null, 4],
  ],
  aylin: [
    [
      "Finish thesis chapter 3",
      "Literature review and method section.",
      "high",
      "in-progress",
      3,
    ],
    ["Email supervisor about feedback", "", "medium", "todo", 0],
    ["Print poster for the symposium", "", "low", "todo", 6],
    ["Submit conference abstract", "", "high", "done", null, 1],
  ],
  noah: [
    ["Angebot für Website-Relaunch schreiben", "", "high", "todo", 1],
    [
      "Logo-Entwürfe überarbeiten",
      "Feedback aus dem letzten Termin einarbeiten.",
      "medium",
      "in-progress",
      2,
    ],
    ["Rechnung an Kunde Müller", "", "high", "todo", -1],
    ["Portfolio aktualisieren", "", "low", "done", null, 6],
  ],
  emma: [
    ["Grocery shopping", "Milk, eggs, spinach, coffee.", "low", "todo", 0],
    ["Call the bank about the card", "", "high", "todo", -1],
    ["Plan weekend trip", "", "medium", "todo", 4],
    ["Yoga class sign-up", "", "low", "done", null, 2],
  ],
  lucas: [
    ["Set up home office desk", "", "medium", "in-progress", 2],
    [
      "Learn TypeScript generics",
      "Finish the course module on conditional types.",
      "medium",
      "todo",
      5,
    ],
    ["Cancel unused subscriptions", "", "low", "todo", null],
  ],
  mia: [["Write ban appeal", "", "high", "todo", 0]],
};

// ---- seeding -------------------------------------------------------------
type Users = Record<string, HydratedDocument<IUser>>;
const need = (users: Users, key: string): HydratedDocument<IUser> => {
  const user = users[key];
  if (!user) throw new Error(`Missing demo user: ${key}`);
  return user;
};

const removePreviousDemoData = async (): Promise<void> => {
  const users = await User.find({ email: DEMO_DOMAIN });
  for (const user of users) await deleteUserAccount(user);
  await ContactSubmission.deleteMany({ email: DEMO_DOMAIN });
  await SupportChat.deleteMany({ origin: "guest", guestEmail: DEMO_DOMAIN });
  console.log(`Removed previous demo data (${users.length} users).`);
};

const createUsers = async () => {
  const users: Users = {};
  for (const person of people) {
    const user = await User.create({
      firstName: person.first,
      lastName: person.last,
      email: `${person.first}.${person.last}@example.com`.toLowerCase(),
      password: DEMO_PASSWORD,
      roles: person.role === "user" ? ["user"] : ["user", person.role],
    });
    await User.updateOne(
      { _id: user._id },
      { $set: { createdAt: at(person.joined, 9), updatedAt: at(person.joined, 9) } },
      { timestamps: false },
    );
    users[person.key] = user;
  }
  const mia = need(users, "mia");
  mia.ban = { isBanned: true, reason: "spam", bannedAt: at(-1, 15) };
  await mia.save();
  return users;
};

const createTasks = async (users: Users) => {
  let count = 0;
  for (const [key, tasks] of Object.entries(tasksByUser)) {
    for (const [
      index,
      [title, description, priority, status, due, completed],
    ] of tasks.entries()) {
      const task = await Task.create({
        owner: need(users, key)._id,
        title,
        description,
        priority,
        status,
        dueDate: due === null ? null : at(due, 17),
        completedAt: status === "done" ? at(-(completed ?? 0), 11 + (index % 6)) : null,
      });
      const touched =
        status === "done" ? at(-(completed ?? 0), 11) : at(-((index % 4) + 1), 14);
      await Task.updateOne(
        { _id: task._id },
        { $set: { createdAt: at(-((index % 5) + 6), 9), updatedAt: touched } },
        { timestamps: false },
      );
      count += 1;
    }
  }
  return count;
};

type Message = Omit<ISupportChat["messages"][number], "_id">;
type ChatSeed = Omit<Partial<ISupportChat>, "messages"> & { messages: Message[] };
const waitingText = (locale: "en" | "de", superAdmin: boolean) =>
  locale === "de"
    ? superAdmin
      ? "Dieser Chat wartet auf einen Super-Support-Agenten."
      : "Dieser Chat wartet auf einen Human-Support-Agenten."
    : superAdmin
      ? "This chat is waiting for a Super Support Agent."
      : "This chat is waiting for a Human Support Agent.";

const createSupportChats = async (users: Users) => {
  const lena = need(users, "lena");
  const james = need(users, "james");
  const aylin = need(users, "aylin");
  const noah = need(users, "noah");
  const emma = need(users, "emma");
  const marco = need(users, "marco");
  const sarah = need(users, "sarah");
  const user = (
    who: HydratedDocument<IUser>,
    content: string,
    createdAt: Date,
  ): Message => ({
    sender: "user",
    senderId: who._id as Types.ObjectId,
    senderName: who.firstName,
    content,
    createdAt,
  });
  const staff = (
    who: HydratedDocument<IUser>,
    content: string,
    createdAt: Date,
  ): Message => ({
    sender: "staff",
    senderId: who._id as Types.ObjectId,
    senderName: who.firstName,
    content,
    createdAt,
  });
  const system = (content: string, createdAt: Date): Message => ({
    sender: "system",
    senderId: null,
    senderName: null,
    content,
    createdAt,
  });
  const welcome = (locale: "en" | "de", createdAt: Date): Message => ({
    sender: "ai",
    senderId: null,
    senderName: CHAT_WELCOME_SENDER,
    content: chatWelcomeMessage(locale),
    createdAt,
  });

  const t1 = at(0, 9, 12);
  const t2 = at(0, 8, 40);
  const t3 = at(-1, 14, 5);
  const t4 = at(0, 7, 55);
  const t5 = at(-2, 16, 20);
  const t6 = at(-3, 11, 0);
  const chats: ChatSeed[] = [
    {
      user: lena._id as Types.ObjectId,
      origin: "user",
      locale: "de",
      subject: "Ich bekomme keine E-Mail zum Zurücksetzen meines Passworts.",
      status: "open",
      escalationReason: "account_access",
      requiresSuperAdmin: false,
      messages: [
        welcome("de", t1),
        user(
          lena,
          "Ich bekomme keine E-Mail zum Zurücksetzen meines Passworts.",
          minutesAfter(t1, 1),
        ),
        system(waitingText("de", false), minutesAfter(t1, 2)),
      ],
    },
    {
      user: james._id as Types.ObjectId,
      origin: "user",
      locale: "en",
      subject: "Can someone help me move tasks between accounts?",
      status: "active",
      escalationReason: "human_requested",
      assignedTo: sarah._id as Types.ObjectId,
      assignedToName: sarah.firstName,
      staffParticipants: [sarah._id as Types.ObjectId],
      messages: [
        welcome("en", t2),
        user(
          james,
          "Can someone help me move tasks between accounts?",
          minutesAfter(t2, 1),
        ),
        system(waitingText("en", false), minutesAfter(t2, 2)),
        system(`${sarah.firstName} joined this support chat.`, minutesAfter(t2, 9)),
        staff(
          sarah,
          "Hi James! Tasks belong to one account, but I can walk you through exporting them. Which account should keep them?",
          minutesAfter(t2, 10),
        ),
        user(
          james,
          "My work account, james.carter@example.com. Thanks!",
          minutesAfter(t2, 14),
        ),
      ],
    },
    {
      user: aylin._id as Types.ObjectId,
      origin: "user",
      locale: "en",
      subject: "Due dates show the wrong time zone",
      status: "ended",
      escalationReason: "human_requested",
      assignedTo: sarah._id as Types.ObjectId,
      assignedToName: sarah.firstName,
      staffParticipants: [sarah._id as Types.ObjectId],
      rating: { score: 5, reason: "Fast and friendly help." },
      endedAt: minutesAfter(t3, 25),
      expiresAt: at(89),
      messages: [
        welcome("en", t3),
        user(
          aylin,
          "Due dates show the wrong time zone after I travelled.",
          minutesAfter(t3, 1),
        ),
        system(waitingText("en", false), minutesAfter(t3, 2)),
        system(`${sarah.firstName} joined this support chat.`, minutesAfter(t3, 6)),
        staff(
          sarah,
          "Your browser time zone is used. After a refresh in the new zone, the dashboard follows it automatically.",
          minutesAfter(t3, 8),
        ),
        user(aylin, "That fixed it, thank you!", minutesAfter(t3, 20)),
        system(`${sarah.firstName} ended this support chat.`, minutesAfter(t3, 25)),
      ],
    },
    {
      user: emma._id as Types.ObjectId,
      origin: "user",
      locale: "en",
      subject: "I think someone else logged into my account",
      status: "open",
      escalationReason: "security",
      requiresSuperAdmin: true,
      messages: [
        welcome("en", t4),
        user(
          emma,
          "I think someone else logged into my account. I see a session I don't recognise.",
          minutesAfter(t4, 1),
        ),
        system(waitingText("en", true), minutesAfter(t4, 2)),
      ],
    },
    {
      user: marco._id as Types.ObjectId,
      origin: "admin",
      locale: "en",
      subject: "Need a super admin to review a ban appeal",
      status: "open",
      escalationReason: "human_requested",
      requiresSuperAdmin: true,
      messages: [
        welcome("en", t5),
        user(
          marco,
          "Need a super admin to review Mia Schneider's ban appeal before Friday.",
          minutesAfter(t5, 1),
        ),
        system(waitingText("en", true), minutesAfter(t5, 2)),
      ],
    },
    {
      user: noah._id as Types.ObjectId,
      origin: "user",
      locale: "de",
      subject: "Wie lösche ich mein Profilbild?",
      status: "ended",
      escalationReason: "human_requested",
      assignedTo: marco._id as Types.ObjectId,
      assignedToName: marco.firstName,
      staffParticipants: [marco._id as Types.ObjectId],
      endedAt: minutesAfter(t6, 18),
      expiresAt: at(87),
      messages: [
        welcome("de", t6),
        user(noah, "Wie lösche ich mein Profilbild?", minutesAfter(t6, 1)),
        system(waitingText("de", false), minutesAfter(t6, 2)),
        system(
          `${marco.firstName} ist diesem Support-Chat beigetreten.`,
          minutesAfter(t6, 7),
        ),
        staff(
          marco,
          "Unter Konto → Account findest du neben deinem Bild „Entfernen“.",
          minutesAfter(t6, 9),
        ),
        system(
          `${marco.firstName} hat diesen Support-Chat beendet.`,
          minutesAfter(t6, 18),
        ),
      ],
    },
  ];

  const guestStart = at(0, 10, 30);
  const guest = {
    origin: "guest" as const,
    locale: "en" as const,
    subject: "Does Karino have a plan for small teams?",
    status: "open" as const,
    escalationReason: "human_requested" as const,
    guestId: randomUUID(),
    guestTokenHash: randomBytes(32).toString("hex"),
    guestEmail: "taylor.reed@example.com",
    messages: [
      welcome("en", guestStart),
      {
        sender: "user" as const,
        senderId: null,
        senderName: "Guest",
        content:
          "Does Karino have a plan for small teams? You can reach me at taylor.reed@example.com.",
        createdAt: minutesAfter(guestStart, 1),
      },
      system(waitingText("en", false), minutesAfter(guestStart, 2)),
    ],
  };

  for (const chat of [...chats, guest]) {
    const created = await SupportChat.create({ lastAgent: "website-help", ...chat });
    const last = chat.messages.at(-1)?.createdAt ?? new Date();
    await SupportChat.updateOne(
      { _id: created._id },
      { $set: { createdAt: chat.messages[0]?.createdAt ?? last, updatedAt: last } },
      { timestamps: false },
    );
  }
  return chats.length + 1;
};

const createContactSubmissions = async (
  users: Record<string, HydratedDocument<IUser>>,
) => {
  const sarah = need(users, "sarah");
  const marco = need(users, "marco");
  const submissions = [
    {
      first: "Daniel",
      last: "Hughes",
      locale: "en",
      days: 0,
      text: "Hi! Is there a way to import tasks from Trello or a CSV file?",
    },
    {
      first: "Julia",
      last: "Becker",
      locale: "de",
      days: -1,
      text: "Hallo, kann ich Aufgaben mit meinem Team teilen oder ist jedes Konto privat?",
    },
    {
      first: "Grace",
      last: "Liu",
      locale: "en",
      days: -1,
      text: "I don't receive the password reset email. I already checked my spam folder.",
    },
    {
      first: "Priya",
      last: "Shah",
      locale: "en",
      days: -4,
      text: "Do you offer a discount for students?",
      reply: {
        by: sarah,
        text: "Hi Priya, Karino is free for personal use, students included. Enjoy!",
      },
    },
    {
      first: "Felix",
      last: "Hoffmann",
      locale: "de",
      days: -6,
      text: "Gibt es Karino auch als App für das Handy?",
      reply: {
        by: marco,
        text: "Hallo Felix, Karino funktioniert vollständig im mobilen Browser. Du kannst es zum Startbildschirm hinzufügen.",
      },
    },
  ] as const;

  for (const item of submissions) {
    const sentAt = at(item.days, 10 + (item.days % 3 === 0 ? 2 : 5));
    const reply = "reply" in item ? item.reply : null;
    const repliedAt = minutesAfter(sentAt, 95);
    const created = await ContactSubmission.create({
      firstName: item.first,
      lastName: item.last,
      email: `${item.first}.${item.last}@example.com`.toLowerCase(),
      locale: item.locale,
      status: reply ? "answered" : "open",
      lastRepliedAt: reply ? repliedAt : null,
      messages: [
        {
          sender: "visitor",
          senderName: `${item.first} ${item.last}`,
          content: item.text,
          createdAt: sentAt,
        },
        ...(reply
          ? [
              {
                sender: "staff" as const,
                senderName: `${reply.by.firstName} ${reply.by.lastName}`,
                senderId: reply.by._id,
                content: reply.text,
                createdAt: repliedAt,
              },
            ]
          : []),
      ],
    });
    await ContactSubmission.updateOne(
      { _id: created._id },
      { $set: { createdAt: sentAt, updatedAt: reply ? repliedAt : sentAt } },
      { timestamps: false },
    );
  }
  return submissions.length;
};

const createAssistantConversations = async (
  users: Record<string, HydratedDocument<IUser>>,
) => {
  const james = need(users, "james");
  const lena = need(users, "lena");
  const friday = at((5 - new Date().getDay() + 7) % 7 || 7, 15);
  const conversations = [
    {
      user: james._id,
      locale: "en",
      subject: "Help me prioritise this week",
      start: at(-1, 9),
      messages: [
        { sender: "user", content: "Help me prioritise this week" },
        {
          sender: "assistant",
          content:
            "Here's a focused order for your week:\n\n1. **Send invoice to Northwind** – it's overdue, so it comes first.\n2. **Prepare client demo** – due today and already in progress.\n3. **Review pull requests** – due tomorrow.\n\nThe Q4 roadmap can wait until later in the week.",
        },
        { sender: "user", content: "Add a task to rehearse the demo on Friday" },
        {
          sender: "assistant",
          content: "Here's a draft. Review it and confirm when you're ready.",
          taskProposal: {
            title: "Rehearse client demo",
            description: "Run through the demo once end to end and time it.",
            priority: "high",
            dueDate: friday,
            status: "pending",
            taskId: null,
          },
        },
      ],
    },
    {
      user: lena._id,
      locale: "de",
      subject: "Plane meinen Tag",
      start: at(0, 8),
      messages: [
        { sender: "user", content: "Plane meinen Tag" },
        {
          sender: "assistant",
          content:
            "Gern! Ein Vorschlag für heute:\n\n- **Vormittag:** Präsentation für den Kundentermin fertigstellen.\n- **Mittag:** Steuerunterlagen sortieren – das ist schon überfällig.\n- **Nachmittag:** Zahnarzttermin vereinbaren.",
        },
      ],
    },
  ] as const;

  for (const conversation of conversations) {
    await AssistantConversation.create({
      user: conversation.user,
      locale: conversation.locale,
      subject: conversation.subject,
      messages: conversation.messages.map((message, index) => ({
        ...message,
        createdAt: minutesAfter(conversation.start, index * 2),
      })),
    });
  }
  return conversations.length;
};

await mongoose.connect(process.env.MONGO_URI!);
try {
  await removePreviousDemoData();
  const users = await createUsers();
  const tasks = await createTasks(users);
  const chats = await createSupportChats(users);
  const contacts = await createContactSubmissions(users);
  const conversations = await createAssistantConversations(users);

  console.log(`
Demo data ready: ${people.length} users, ${tasks} tasks, ${chats} support chats,
${contacts} contact messages, ${conversations} assistant conversations.

Every demo account uses the password: ${DEMO_PASSWORD}
  admin        olivia.bennett@example.com, sarah.klein@example.com, marco.rossi@example.com
  user         lena.wagner@example.com (German), james.carter@example.com, …
  banned       mia.schneider@example.com
`);
} finally {
  await mongoose.disconnect();
}
