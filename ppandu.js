const rp = require('request-promise')
const cheerio = require('cheerio')
const fs = require('fs')

let page = ''
let array = ['arkansas']
let current_index = 0
let start = 0
let end
const sleep = (waitTimeInMs) => new Promise((resolve) => setTimeout(resolve, waitTimeInMs))
async function main() {
  // var current_page = 1
  // try{
  //   var state = array[current_index]
  //   var url = 'https://phones-calls.com/state-index/'+state+'?page='+current_page
  //   do {

  //   } while (condition);
  // }
  // catch(e){

  // }
  // finally{

  // }
  array.forEach(async (state) => {
    var current_page = 1
    var url = 'https://phones-calls.com/state-index/' + state + '?page=' + current_page
    var nextexist = false
    let data = []
    do {
      try {
        const htmlResult = await rp.get(url)
        const $ = await cheerio.load(htmlResult)
        nextexist = $('.pagination > li:nth-child(2)').hasClass('disabled')
        url = $('.pagination > li:nth-child(2) > a').attr('href')
        $('.entry')
          .children('p')
          .children('a')
          .map(async function () {
            var nextcityexist = false
            var nextcityurl = 'https://phones-calls.com' + $(this).attr('href') + '?page=1'
            do {
              const htmlResult2 = await rp.get(nextcityurl)
              const $2 = await cheerio.load(htmlResult2)
              $2('tbody')
                .children('tr')
                .map(function () {
                  var name = ''
                  var phone = ''
                  var address = ''
                  $2(this)
                    .children('td')
                    .map((i, v) => {
                      if (i == 0) {
                        name = $(v).text()
                      } else if (i == 1) {
                        phone = $(v).text()
                      } else {
                        address = $(v).text()
                      }
                    })
                  data.push({
                    name,
                    phone,
                    address,
                    url,
                  })
                })
              nextcityexist = $2('.pagination > li:nth-child(2)').hasClass('disabled')
              nextcityurl = $2('.pagination > li:nth-child(2) > a').attr('href')
              await sleep(1500)
            } while (!nextcityexist)
          })
        current_page++
      } catch (error) {
        console.log(error)
      } finally {
        var temp = current_page - 1
        console.log('page ' + temp + ' of state ' + state + ' is complete')
        fs.writeFile(state + '_' + temp, JSON.stringify(data), () => {
          console.log('file written for page ', temp)
        })
      }
    } while (!nextexist)
  })
}

main()
