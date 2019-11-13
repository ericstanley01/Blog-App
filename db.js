let mongodb = require('mongodb')
const dotenv = require('dotenv')

dotenv.config()

const connnectionString = 'mongodb+srv://' + process.env.MONGODB_USERNAME +
  ':' + process.env.MONGODB_PASSWORD +
  '@' + process.env.MONGODB_CLUSTER + '-rej5u.mongodb.net/' +
  process.env.MONGODB_DATABASE + '?retryWrites=true&w=majority'

mongodb.connect(connnectionString, {useNewUrlParser: true,
  useUnifiedTopology: true}, (err, client) => {
  module.exports = client
  const app = require('./app')
  app.listen(process.env.PORT)
})
