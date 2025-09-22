import type { PanelComponent } from '@strapi/content-manager/strapi-admin'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { Button, Flex } from '@strapi/design-system'
import { Download } from '@strapi/icons'
import { useFetchClient } from '@strapi/strapi/admin'

import { PLUGIN_ID } from '../pluginId'

const QRCodePanel: PanelComponent = (props) => {
  const { activeTab, model, documentId } = props

  const { get } = useFetchClient()

  const [uri, setUri] = useState<string | undefined>(undefined)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const downloadAsSvg = () => {
    if (!svgRef.current) return
    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svgRef.current)
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'qr-code.svg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const downloadAsEps = async () => {
    if (!svgRef.current) return
    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svgRef.current)
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const image = new Image()
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return

    const viewBox = svgRef.current.getAttribute('viewBox')
    let width = 1024
    let height = 1024
    if (viewBox) {
      const parts = viewBox.split(' ').map(Number)
      if (parts.length === 4) {
        width = Math.max(1, Math.round(parts[2]))
        height = Math.max(1, Math.round(parts[3]))
      }
    }
    canvas.width = width
    canvas.height = height

    await new Promise<void>((resolve, reject) => {
      image.onload = () => {
        context.clearRect(0, 0, width, height)
        context.drawImage(image, 0, 0, width, height)
        resolve()
      }
      image.onerror = () => reject(new Error('Failed to render SVG to image'))
      image.src = url
    })

    const imageData = context.getImageData(0, 0, width, height)
    const data = imageData.data

    const isBlack = (x: number, y: number) => {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const a = data[idx + 3]
      if (a < 128) return false
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      return luminance < 128
    }

    // Estimate margin and module size by scanning from top-left
    let firstBlackY = -1
    for (let y = 0; y < height && firstBlackY === -1; y++) {
      for (let x = 0; x < width; x++) {
        if (isBlack(x, y)) {
          firstBlackY = y
          break
        }
      }
    }
    if (firstBlackY === -1) {
      URL.revokeObjectURL(url)
      return
    }

    // On the row with first black, find margin and first black run length
    let margin = 0
    while (margin < width && !isBlack(margin, firstBlackY)) margin++
    let moduleSize = 1
    while (margin + moduleSize < width && isBlack(margin + moduleSize, firstBlackY)) moduleSize++
    if (moduleSize <= 0) moduleSize = 1

    // Estimate modules count (square QR)
    const modules = Math.max(21, Math.round((Math.min(width, height) - 2 * margin) / moduleSize))
    const effectiveModule = (Math.min(width, height) - 2 * margin) / modules

    const sampleAt = (mx: number, my: number) => {
      const cx = Math.min(width - 1, Math.max(0, Math.round(margin + (mx + 0.5) * effectiveModule)))
      const cy = Math.min(height - 1, Math.max(0, Math.round(margin + (my + 0.5) * effectiveModule)))
      return isBlack(cx, cy)
    }

    // Build EPS content using filled unit rectangles for black modules
    const scale = 10 // points per module
    const epsWidth = Math.round(modules * scale)
    const epsHeight = Math.round(modules * scale)

    const lines: string[] = []
    lines.push('%!PS-Adobe-3.0 EPSF-3.0')
    lines.push(`%%BoundingBox: 0 0 ${epsWidth} ${epsHeight}`)
    lines.push('%%LanguageLevel: 2')
    lines.push('%%Pages: 1')
    lines.push('%%EndComments')
    lines.push('gsave')
    lines.push(`${scale} ${scale} scale`)
    // white background
    lines.push('1 setgray')
    lines.push('newpath 0 0 moveto')
    lines.push(`${modules} 0 rlineto 0 ${modules} rlineto -${modules} 0 rlineto closepath fill`)
    // draw black modules
    lines.push('0 setgray')
    for (let y = 0; y < modules; y++) {
      let runStart = -1
      for (let x = 0; x < modules; x++) {
        const black = sampleAt(x, y)
        if (black && runStart === -1) {
          runStart = x
        }
        if ((!black || x === modules - 1) && runStart !== -1) {
          const runEnd = black && x === modules - 1 ? x + 1 : x
          const runLen = runEnd - runStart
          lines.push(`newpath ${runStart} ${modules - 1 - y} moveto ${runLen} 0 rlineto 0 -1 rlineto -${runLen} 0 rlineto closepath fill`)
          runStart = -1
        }
      }
    }
    lines.push('grestore')
    lines.push('%%EOF')

    const epsBlob = new Blob([lines.join('\n')], { type: 'application/postscript;charset=utf-8' })
    const epsUrl = URL.createObjectURL(epsBlob)
    const link = document.createElement('a')
    link.href = epsUrl
    link.download = 'qr-code.eps'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(epsUrl)
    URL.revokeObjectURL(url)
  }

  const downloadAsPng = async () => {
    if (!svgRef.current) return
    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svgRef.current)
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const image = new Image()
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return

    const viewBox = svgRef.current.getAttribute('viewBox')
    let width = 1024
    let height = 1024
    if (viewBox) {
      const parts = viewBox.split(' ').map(Number)
      if (parts.length === 4) {
        width = Math.max(1, Math.round(parts[2]))
        height = Math.max(1, Math.round(parts[3]))
      }
    }
    canvas.width = width
    canvas.height = height

    await new Promise<void>((resolve, reject) => {
      image.onload = () => {
        context.clearRect(0, 0, width, height)
        context.drawImage(image, 0, 0, width, height)
        resolve()
      }
      image.onerror = () => reject(new Error('Failed to render SVG to image'))
      image.src = url
    })

    const pngUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = pngUrl
    link.download = 'qr-code.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (model && documentId && activeTab) {
      get<{computedValue: string}>(`/${PLUGIN_ID}/value?uid=${model}&status=${activeTab}&documentId=${documentId}`)
        .then((response) => setUri(response.data.computedValue))
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error('Error fetching QR code value:', error)
          setUri(undefined)
        })
    }
  }, [activeTab, model, documentId])

  if (!uri) {
    return null
  }
  
  return {
    title: 'QR Code',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <QRCodeSVG
          ref={svgRef as any}
          value={uri}
          title={uri}
          marginSize={1}
          style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
        />
        <Flex gap={2} wrap="wrap">
          <Button startIcon={<Download />} onClick={downloadAsSvg}>
            Download SVG
          </Button>
          <Button startIcon={<Download />} onClick={downloadAsEps}>
            Download EPS
          </Button>
          <Button startIcon={<Download />} onClick={downloadAsPng}>
            Download PNG
          </Button>
        </Flex>
      </div>
    ),
  }
}

export default QRCodePanel
