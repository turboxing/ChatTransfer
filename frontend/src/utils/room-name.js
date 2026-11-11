const ROOM_NAME_POOLS = {
  'zh-CN': ['快速传输', '临时中转', '设备联调', '文件互传', '测试协作', '随手分享'],
  en: ['Quick Transfer', 'File Drop', 'Device Sync', 'Test Session', 'Quick Share', 'Temporary Room'],
  ar: ['نقل سريع', 'مشاركة الملفات', 'مزامنة الأجهزة', 'جلسة اختبار', 'مشاركة مؤقتة', 'غرفة سريعة']
}

export function generateRoomName(locale = 'en', random = Math.random) {
  const pool = ROOM_NAME_POOLS[locale] || ROOM_NAME_POOLS.en
  const index = Math.min(Math.floor(random() * pool.length), pool.length - 1)
  const suffix = 1000 + Math.floor(random() * 9000)
  return `${pool[index]} ${suffix}`
}
