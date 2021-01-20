var mongo = require('mongodb').MongoClient
const axios = require('axios')
const fs = require('fs')
var cloudinary = require('cloudinary').v2
var Zip = require('adm-zip')
const md5File = require('md5-file')
require('dotenv').config()
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
})

const sleep = (waitTimeInMs) => new Promise((resolve) => setTimeout(resolve, waitTimeInMs))

// async function main() {
//   console.log('starting')
//   await sleep(5000)
//   console.log('5 seconds over')
// }
// main()

const url = process.env.MONGO_URI
const dbname = 'dlldb'
const client = new mongo(url, { useNewUrlParser: true, useUnifiedTopology: true })


client.connect(function (url) {
  console.log('connected successfully to server')
  const db = client.db(dbname)

  db.collection('dll', function (err, collection) {
    if (err) throw err

    console.log('collection searching')
    collection.find({}).toArray(async (err, result) => {
      if (err) throw err

      console.log('collection found')
      for (var i = 0; i < result.length; i++) {
        console.log('current dll is: ' + result[i].file_name + ' at number ' + i)
        for (var j = 0; j < result[i].files.length; j++) {
          console.log('current version is: ' + result[i].files[j].version)
          if (!result[i].files[j].download_link.includes('cloudinary')) {
            console.log('found link without cloudinary and sleeping for 5 sec')
            await sleep(3000)
            console.log('now downloading')
            const body = await axios.get(result[i].files[j].download_link, {
              responseType: 'arraybuffer',
            })
            console.log('download complete')
            let file_name = result[i].files[j].md5 + '.zip'
            try{
            var zip = new Zip(body.data)
            }
            catch(err){
              process.exit()
            }
            zip.deleteFile('readme.txt')
            zip.deleteFile('DLL4free.com.url')
            zip.writeZip(file_name)
            var hash = md5File.sync(file_name)
            fs.rename(file_name, hash + '.zip', function (err) {
              if (err) throw err
            })
            if (result[i].files[j].size.toString().search('MB') > -1 && parseFloat(result[i].files[j].size) > 10) {
              db.collection('dll').updateOne(
                {
                  _id: result[i]._id,
                  'files.md5': result[i].files[j].md5,
                },
                {
                  $set: {
                    'files.$.download_link': 'cloudinary',
                  },
                },
                function (err, doc) {
                  if (err) throw err
                  console.log('could not upldate as file is more than 10 mb')
                }
              )
              break
            }
            console.log('oldname: ' + file_name + ' new name: ' + hash)
            var rawres = await cloudinary.uploader.upload(hash + '.zip', { resource_type: 'auto', use_filename: true, unique_filename: false })
            console.log('the new url is: ' + rawres.url)
            db.collection('dll').updateOne(
              {
                _id: result[i]._id,
                'files.md5': result[i].files[j].md5,
              },
              {
                $set: {
                  'files.$.md5': hash,
                  'files.$.download_link': rawres.url,
                },
              },
              function (err, doc) {
                if (err) throw err

                console.log('new url updated')
              }
            )
          } else {
            console.log('this is already updated')
          }
        }
      }
      process.exit()
    })
  })
})
