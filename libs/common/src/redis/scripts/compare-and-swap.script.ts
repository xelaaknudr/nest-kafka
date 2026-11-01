/**
 * compare-and-swap.script.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Атомарный Compare-And-Swap (CAS) скрипт для Redis.
 *
 * В проде скрипты никогда не пишут инлайн в контроллерах.
 * Они выносятся в отдельные константы/файлы и регистрируются
 * один раз при инициализации Redis-клиента через defineCommand().
 */

export const COMPARE_AND_SWAP_COMMAND = {
  name: 'compareAndSwap',
  numberOfKeys: 1,
  lua: `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      redis.call("SET", KEYS[1], ARGV[2])
      return 1
    else
      return 0
    end
  `,
} as const;
