import type { PanelComponent } from '@strapi/content-manager/strapi-admin'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { Button, Flex, Typography, Link } from '@strapi/design-system'
import { Download, ExternalLink } from '@strapi/icons'
import { useFetchClient } from '@strapi/strapi/admin'

import { PLUGIN_ID } from '../pluginId'
import { qrToEPS } from '../utils/qr-to-eps'

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

  async function downloadAsEps(value: string) {
    const eps = await qrToEPS(value, { ecLevel: 'M', marginModules: 1, ptPerModule: 10 })
    const blob = new Blob([eps], { type: 'application/postscript;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'qr-code.eps'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
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
          ref={svgRef}
          value={uri}
          level="M"
          size={1024}
          title={uri}
          marginSize={1}
          style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
        />
        <Flex direction="column" gap={3}>
          <Flex direction="column" gap={2}>
            <Typography variant="pi" fontWeight="bold" textColor="neutral800">
              URL:
            </Typography>
            <Link 
              href={uri} 
              target="_blank" 
              rel="noopener noreferrer"
              startIcon={<ExternalLink />}
              style={{ 
                wordBreak: 'break-all',
                textDecoration: 'none',
              }}
            >
              {uri}
            </Link>
          </Flex>
          <Flex gap={2} wrap="wrap">
            <Button startIcon={<Download />} onClick={downloadAsSvg}>
              Download SVG
            </Button>
            <Button startIcon={<Download />} onClick={downloadAsPng}>
              Download PNG
            </Button>
            <Button startIcon={<Download />} onClick={() => downloadAsEps(uri)}>
              Download EPS
            </Button>
          </Flex>
        </Flex>
      </div>
    ),
  }
}

export default QRCodePanel
