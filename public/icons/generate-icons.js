#!/usr/bin/env node
// Script untuk generate semua icon PWA dari SVG
// Jalankan: node public/icons/generate-icons.js
// Requires: npm install sharp (hanya saat generate, tidak perlu di production)

const fs   = require('fs')
const path = require('path')

// SVG source — logo Portalog (ship icon)
const SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Background circle -->
  <rect width="512" height="512" rx="96" fill="#3b82f6"/>
  
  <!-- Ship icon (simplified from Lucide Ship) -->
  <g transform="translate(96, 80)" fill="none" stroke="white" stroke-width="28" stroke-linecap="round" stroke-linejoin="round">
    <!-- Hull -->
    <path d="M20 200 L300 200 L280 320 L40 320 Z" fill="white" stroke="none"/>
    <!-- Superstructure -->
    <rect x="80" y="100" width="160" height="100" rx="8" fill="white" stroke="none"/>
    <!-- Chimney -->
    <rect x="140" y="40" width="40" height="70" rx="4" fill="white" stroke="none"/>
    <!-- Waves -->
    <path d="M0 350 Q40 330 80 350 Q120 370 160 350 Q200 330 240 350 Q280 370 320 350" stroke="rgba(255,255,255,0.7)" stroke-width="20" fill="none"/>
  </g>
</svg>`

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

async function generate() {
  try {
    const sharp = require('sharp')
    const dir   = path.dirname(__filename)

    console.log('Generating icons...')

    for (const size of SIZES) {
      const outPath = path.join(dir, `icon-${size}x${size}.png`)
      await sharp(Buffer.from(SVG_ICON))
        .resize(size, size)
        .png()
        .toFile(outPath)
      console.log(`✓ icon-${size}x${size}.png`)
    }

    // Shortcut icons
    for (const name of ['shortcut-new', 'shortcut-list']) {
      await sharp(Buffer.from(SVG_ICON)).resize(96, 96).png()
        .toFile(path.join(dir, `${name}.png`))
      console.log(`✓ ${name}.png`)
    }

    // Screenshot placeholder
    const screenshotSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844">
      <rect width="390" height="844" fill="#f8fafc"/>
      <text x="195" y="422" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#94a3b8">Screenshot Preview</text>
    </svg>`
    await sharp(Buffer.from(screenshotSvg)).png()
      .toFile(path.join(dir, 'screenshot-mobile.png'))
    console.log('✓ screenshot-mobile.png')

    console.log('\nSemua icon berhasil dibuat!')
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      console.log('Install sharp terlebih dahulu: npm install sharp --save-dev')
      console.log('Atau gunakan realfavicongenerator.net untuk generate icon manual')
      // Fallback: buat placeholder PNG files menggunakan base64
      generatePlaceholders()
    } else {
      throw e
    }
  }
}

function generatePlaceholders() {
  // 1x1 blue PNG sebagai placeholder
  const BLUE_1X1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  )
  const dir = path.dirname(__filename)
  const allFiles = [...SIZES.map(s => `icon-${s}x${s}.png`), 'shortcut-new.png', 'shortcut-list.png', 'screenshot-mobile.png']
  for (const f of allFiles) {
    const outPath = path.join(dir, f)
    if (!fs.existsSync(outPath)) {
      fs.writeFileSync(outPath, BLUE_1X1)
      console.log(`⚠ ${f} (placeholder — ganti dengan icon asli)`)
    }
  }
  console.log('\nPlaceholder icon dibuat. Install sharp lalu jalankan ulang untuk icon proper.')
}

generate()
