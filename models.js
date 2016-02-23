module.exports = {
  users: [
    {
      id: "user.id.1",
      username: "test",
      password: "1234",
      devices: [
        {
          id: "device.id.1",
          type: "android",
          token: "testpushtoken1"
        },
        {
          id: "device.id.2",
          type: "ios",
          token: "testpushtoken2"
        }
      ]
    }
  ]
}
