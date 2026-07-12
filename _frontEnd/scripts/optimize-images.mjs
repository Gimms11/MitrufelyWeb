/**
 * optimize-images.mjs — Convierte y optimiza las imágenes de public/ a WebP
 *
 * Uso:  node scripts/optimize-images.mjs
 *
 * Genera versiones .webp al lado de cada .png/.jpg con redimensionamiento
 * apropiado para web. Mantiene el original como fallback.
 */
import sharp from 'sharp'
import { readdir, stat, rename } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname as dirName } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirName(__filename)
const publicDir = join(__dirname, '..', 'public')

/**
 * Configuración por imagen: ancho máximo de salida.
 * Las imágenes no listadas usan un default de 1280px.
 * El hero (4.png) va más ancho porque es full-bleed.
 */
const IMAGE_CONFIG = {
  '4.png': { width: 1600, quality: 78 }, // LCP hero — más ancho, calidad media
  '8.png': { width: 1280, quality: 75 }, // About hero
  '9.png': { width: 1000, quality: 75 }, // SharedMoments
  '10.png': { width: 1000, quality: 75 }, // SharedMoments
  'image.png': { width: 1280, quality: 75 },
}

const DEFAULT_CONFIG = { width: 1024, quality: 75 }

async function processImage(filePath, fileName) {
  const config = IMAGE_CONFIG[fileName] ?? DEFAULT_CONFIG
  const outPath = filePath.replace(extname(fileName), '.webp')
  const stats = await stat(filePath)
  const originalKB = (stats.size / 1024).toFixed(0)

  try {
    const info = await sharp(filePath)
      .resize({ width: config.width, withoutEnlargement: true })
      .webp({ quality: config.quality, effort: 6 })
      .toFile(outPath)

    const newKB = (info.size / 1024).toFixed(0)
    const reduction = ((1 - info.size / stats.size) * 100).toFixed(0)
    console.log(
      `  ✅ ${fileName}: ${originalKB}KB → ${newKB}KB (${reduction}% menor) [${info.width}×${info.height}]`,
    )
  } catch (err) {
    console.error(`  ❌ ${fileName}: ${err.message}`)
  }
}

async function main() {
  console.log('🖼️  Optimizando imágenes de public/ → WebP\n')

  if (!existsSync(publicDir)) {
    console.error('No se encontró la carpeta public/')
    process.exit(1)
  }

  const files = await readdir(publicDir)
  const imageFiles = files.filter((f) => /\.(png|jpe?g)$/i.test(f))

  if (imageFiles.length === 0) {
    console.log('No se encontraron imágenes para optimizar.')
    return
  }

  console.log(`Encontradas ${imageFiles.length} imágenes:\n`)

  // Renombrar archivos con espacios/paréntesis primero
  for (const f of imageFiles) {
    if (f.includes(' ') || f.includes('(') || f.includes(')')) {
      const cleanName = f
        .replace(/\s*\(1\)\s*/, '-alt')
        .replace(/\s+/g, '-')
        .replace(/[()]/g, '')
        .replace(/-+/g, '-')
      const oldPath = join(publicDir, f)
      const newPath = join(publicDir, cleanName)
      if (!existsSync(newPath)) {
        await rename(oldPath, newPath)
        console.log(`  📝 Renombrado: "${f}" → ${cleanName}`)
        imageFiles[imageFiles.indexOf(f)] = cleanName
      }
    }
  }

  console.log('')
  for (const f of imageFiles) {
    await processImage(join(publicDir, f), f)
  }

  console.log('\n✨ Optimización completada.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
