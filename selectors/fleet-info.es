import { createSelector } from 'reselect'
import _ from 'lodash'

import {
  basicSelector,
  fleetShipsDataSelectorFactory,
  fleetShipsEquipDataSelectorFactory,
  fleetSelectorFactory,
} from 'views/utils/selectors'

import { error, enumFromTo } from '../utils'

const fleetNumberCountSelector = createSelector(
  basicSelector,
  basic => _.get(basic,'api_count_deck',4))

// get the sorted array of all api_id of openned fleets
const allFleetIdsSelector = createSelector(
  fleetNumberCountSelector,
  _.memoize(count => enumFromTo(1,count)))

const arrayOrUndef = x =>
  (Array.isArray(x) || typeof x === 'undefined') ?
    _.noop() :
    error(`Expecting an Array or undefined value but get ${x}`)

const objOrUndef = x =>
  ((x !== null && typeof x === 'object') || typeof x === 'undefined') ?
    _.noop() :
    error(`Expecting an Object or undefined value but get ${x}`)

/*

reorganize data, shape it to form the basic input structure
of other functions.

CONTRACT:
 - shipsData is either an array or undefined
 - equipsData is either an array or undefined
 - fleetData is either an object or undefined
 for all inputs above, undefined is used only when the fleet in question
 is not yet unlocked in game.

returns a fleet representation when the fleet can be found, "null" otherwise.

*/
const mkFleetInfo = (shipsData, equipsData, fleetData) => {
  arrayOrUndef(shipsData)
  arrayOrUndef(equipsData)
  objOrUndef(fleetData)

  if (!shipsData || !equipsData || !fleetData)
    return null

  const ships = shipsData.map(([ship, $ship], ind) => {
    const equips = _.compact(equipsData[ind])
      .map(([equipInst, $equip]) => ({
        mstId: $equip.api_id,
        rstId: equipInst.api_id,
        level: equipInst.api_level,
      }))
    const [[curAmmo, maxAmmo], [curFuel,maxFuel]] =
      [[ship.api_bull, $ship.api_bull_max],
       [ship.api_fuel, $ship.api_fuel_max]]
    return {
      mstId: $ship.api_id,
      // roster ID of current ship
      rstId: ship.api_id,
      name: $ship.api_name,
      equips,
      level: ship.api_lv,
      morale: ship.api_cond,
      maxAmmo, maxFuel,
      needResupply: curAmmo !== maxAmmo || curFuel !== maxFuel,
      stype: $ship.api_stype,
    }
  })

  return {
    id: fleetData.api_id,
    name: fleetData.api_name,
    available: fleetData.api_mission[0] === 0,
    ships,
  }
}

// 1 <= fleetId <= 4
const mkFleetInfoSelector = _.memoize(fleetId => {
  const fleetInd = fleetId-1
  return createSelector(
    fleetShipsDataSelectorFactory(fleetInd),
    fleetShipsEquipDataSelectorFactory(fleetInd),
    fleetSelectorFactory(fleetInd),
    mkFleetInfo)
})

const indexedFleetsInfoSelector = createSelector(
  [1,2,3,4].map(mkFleetInfoSelector),
  (...fleets) => _.keyBy(fleets,'id'))

export {
  allFleetIdsSelector,
  mkFleetInfoSelector,
  indexedFleetsInfoSelector,
}