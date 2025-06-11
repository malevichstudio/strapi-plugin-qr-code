// export default routes
export default {
  admin: {
    type: 'admin',
    routes: [
      {
        method: 'GET',
        path: '/value',
        handler: 'admin.getQRCodeValue',
        config: {
          policies: ['admin::isAuthenticatedAdmin'],
        },
      },
    ],
  },
}
