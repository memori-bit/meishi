/**
 * catch で受け取った unknown をユーザー向けメッセージ文字列に変換する。
 * Event やその他のオブジェクトが渡っても [object Event] などにならないようにする。
 */
export function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message
  }
  return fallback
}
