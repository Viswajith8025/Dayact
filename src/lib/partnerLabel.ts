export function partnerDisplayName(options: {
  myPartnerNickname: string | null | undefined
  theirDisplayName: string | null | undefined
}): string {
  const nick = options.myPartnerNickname?.trim()
  if (nick) return nick
  const name = options.theirDisplayName?.trim()
  if (name) return name
  return 'Teammate'
}
