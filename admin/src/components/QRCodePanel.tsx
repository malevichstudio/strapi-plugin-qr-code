import type { PanelComponent } from '@strapi/content-manager/strapi-admin'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { useFetchClient } from '@strapi/strapi/admin'

import { PLUGIN_ID } from '../pluginId'

const QRCodePanel: PanelComponent = (props) => {
  const { activeTab, model, documentId } = props

  const { get } = useFetchClient()

  const [uri, setUri] = useState<string | undefined>(undefined)

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
      <QRCodeSVG
        value={uri}
        title={uri}
        marginSize={1}
        style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
      />
    ),
  }
}

export default QRCodePanel
