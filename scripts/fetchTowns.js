var fs = require('fs')
var axios = require('axios')

const communities = require('../communities.json')
const towns = require('../failed_towns.json')


const googleURl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?inputtype=textquery&input=`

// Needs a google places API key
const API_KEY = process.env.API_KEY

function findTown(town) {

  const fields = `&fields=name,place_id`
  const url = `${googleURl}${encodeURIComponent(town)}&key=${API_KEY}${fields}&components=country:es`

  return axios.get(url)
    .then(response => {
      return response.data
    })
    .then(response => {
      if (response.candidates.length > 0) {
        return getDetail(response.candidates[0].place_id)
          .then(i => {
            return i ? {
              ...i,
              name: town,
            } : null
          })
      } else {
        return null
      }
    })
    .catch((err) => {
      console.log('error', err)
      return null
    })
}

function getDetail(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?language=es&place_id=${placeId}&fields=name,rating,address_components&key=${API_KEY}`

  return axios.get(url)
    .then(response => {
      return response.data
    })
    .then(response => {

      if (response.result) {
        const province = response.result.address_components.find(i => i.types.indexOf('administrative_area_level_2') !== -1)
        const community = response.result.address_components.find(i => i.types.indexOf('administrative_area_level_1') !== -1)
        const postalcode = response.result.address_components.find(i => i.types.indexOf('postal_code') !== -1)

        return {
          province: province ? province.long_name : '',
          community: community ? community.long_name : '',
          postalcode: postalcode ? postalcode.long_name : '',
        }
      } else {
        return null
      }

    })
}


function formatCommunityName(name) {
  let community = name
  if (community === 'Vizcaya') {
    community = 'Bizkaia'
  }
  if (community === 'Principado de Asturias') {
    community = 'Asturias'
  }
  if (community === 'Región de Murcia') {
    community = 'Murcia'
  }
  if (community === 'Islas Baleares') {
    community = 'Baleares'
  }
  if (community === 'Catalunya') {
    community = 'Cataluña'
  }

  return community
}

function formatProvinceName(name) {
  let province = name

  if (province === 'Vizcaya') {
    province = 'Bizkaia'
  }
  if (province === 'Principado de Asturias') {
    province = 'Asturias'
  }
  if (province === 'Región de Murcia') {
    province = 'Murcia'
  }
  if (province === 'Islas Baleares') {
    province = 'Baleares'
  }

  if (province === 'Las Palmas') {
    province = 'Las Palmas de Gran Canaria'
  }
  if (province === 'Lérida') {
    province = 'Lleida'
  }
  if (province === 'La Coruña') {
    province = 'A Coruña'
  }

  return province
}

function getTownInfo(town) {
  return findTown(town)
    .then(item => {

      if (!item) {
        console.log('Town not found', town)
      } else {
        let community = null
        let province = null
        const communityToFind = formatCommunityName(item.community)
        community = communities.find(i => communityToFind.toLowerCase() === i.name.toLowerCase())
        
        if (!community) {
          console.log('Pueblo con comunidad', communityToFind, ' no encontrado')
          return null
        } else {
          if (community.provinces.length > 0) {
            const provinceToFind = formatProvinceName(item.province)

            province = community.provinces.find(i => i.name.toLowerCase() === provinceToFind.toLowerCase())

            if (!province) {
              console.log('Provincia', item.province, 'no encontrada')
              return null
            }

          }

          return {
            ...item,
            communityId: community.code,
            provinceId: province.code
          }
        }
      }
    })
    .catch(e => {
      return null
    })
}

const response = []

const failed = []


var getItem = function (townItem) {

  if (!townItem) {
    return Promise.resolve()
  }
  return getTownInfo(townItem.nm)
    .then(i => {
      if (i && i.communityId) {
        response.push(i)
      } else {
        failed.push(townItem)
      }
      return i
    })

}

let i = 0

function iterateList(i) {
  return new Promise((resolve, reject) => {
    console.log('Fetching item ', i, 'of ', towns.length)
    getItem(towns[i])
      .then(() => {
        if (i < towns.length) {
          setTimeout(() => {
            iterateList(i + 1)
              .then(resolve)
          }, 10)
        } else {
          resolve()
        }
      })
      .catch((err) => {
        console.log('error', err)
        resolve()
      })
  })
}


iterateList(i)
  .then(results => {
    fs.writeFileSync('result2.json', JSON.stringify(response, null, 2))
    fs.writeFileSync('failed2.json', JSON.stringify(failed, null, 2))
  })
  .catch(err => {
    fs.writeFileSync('result2.json', JSON.stringify(response, null, 2))
    fs.writeFileSync('failed2.json', JSON.stringify(failed, null, 2))
  })