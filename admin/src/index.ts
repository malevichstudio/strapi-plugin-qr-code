import type { Plugin } from '@strapi/strapi'
import type { StrapiApp } from '@strapi/strapi/admin'
import QRCodePanel from './components/QRCodePanel'

export default {
  register() {},

  bootstrap(app: StrapiApp) {
    // Add qr code in editViewPanel
    // @ts-expect-error too few description type in strapi
    app.getPlugin('content-manager').apis.addEditViewSidePanel([QRCodePanel])
  },

  registerTrads({ locales }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`)

          return { data, locale }
        } catch {
          return { data: {}, locale }
        }
      }),
    )
  },
} satisfies Plugin.Config.AdminInput
