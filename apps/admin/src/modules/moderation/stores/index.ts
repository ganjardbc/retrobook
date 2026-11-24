import { defineStore } from 'pinia'
import { actions } from './actions'
import { getters } from './getters'
import { state } from './state'

export const useModerationStore = defineStore('admin-moderation', { state, getters, actions })
