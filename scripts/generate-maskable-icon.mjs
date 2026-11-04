/**
 * PWA maskable icon: 512 canvas, logo at 60% (Android safe zone ~66% diameter).
 * Run: node scripts/generate-maskable-icon.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const input = join(root, 'public/icons/icon-512.png')
const output = join(root, 'public/icons/icon-512-maskable.png')
const size = 512
const logoSize = Math.round(size * 0.6)

const logo = await sharp(readFileSync(input)).resize(logoSize, logoSize, { fit: 'contain' }).png().toBuffer()
const padded = await sharp({
  create: {
    width: size,
    height: size,
    channels: 4,
    background: { r: 242, g: 242, b: 245, alpha: 1 },
  },
})
  .composite([{ input: logo, gravity: 'center' }])
  .png()
  .toBuffer()

writeFileSync(output, padded)
console.log('Wrote', output)
