/**
 * Sumber teks bot (BOT-01). Implementasi bawaan memakai templat tanpa jaringan; model bahasa
 * (keputusan D-7, masih ditunda) cukup mengimplementasikan kelas ini dan didaftarkan di BotsModule.
 */
export abstract class BotTextProvider {
  abstract post(persona: string): Promise<string>
  abstract reply(persona: string, comment: string): Promise<string>
}

const POSTS = [
  'Thinking about {t} today. What do you all think? #{t}',
  'Anyone else into {t}? Share your favorites! #{t}',
  'Small reminder to enjoy {t} this week.',
  'Today is a good day for {t}. #{t}',
  'Hot take: {t} is underrated.',
]
const REPLIES = [
  'Thanks for the comment!',
  'Great point, thanks for sharing.',
  'Love hearing that :)',
  'Totally, {t} is the best.',
  'Appreciate it!',
]

/** `persona` berisi topik dipisah koma, mis. "coffee, music, travel". */
export const topicsOf = (persona: string) => {
  const topics = persona
    .split(',')
    .map((t) =>
      t
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ''),
    )
    .filter(Boolean)
  return topics.length ? topics : ['life']
}

export class TemplateBotTextProvider extends BotTextProvider {
  private pick<T>(list: T[]) {
    return list[Math.floor(Math.random() * list.length)]!
  }

  async post(persona: string) {
    return this.pick(POSTS).replace(/\{t\}/g, this.pick(topicsOf(persona)))
  }

  async reply(persona: string, _comment: string) {
    return this.pick(REPLIES).replace(/\{t\}/g, this.pick(topicsOf(persona)))
  }
}
