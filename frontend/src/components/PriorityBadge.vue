<script setup>
import { computed } from 'vue'
import Tag from 'primevue/tag'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  value: {
    type: String,
    default: 'medium',
  },
})
const { t } = useI18n()

const SEVERITY_MAP = {
  low: 'success',
  medium: 'warn',
  high: 'danger',
}

const label = computed(() => {
  if (!props.value) {
    return t('tickets.priority.unknown')
  }

  return t(`tickets.priority.${props.value}`)
})
const severity = computed(() => SEVERITY_MAP[props.value] || 'secondary')
</script>

<template>
  <Tag :value="label" :severity="severity" rounded />
</template>
