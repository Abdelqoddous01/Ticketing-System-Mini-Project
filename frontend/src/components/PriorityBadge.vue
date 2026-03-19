<script setup>
import { computed } from 'vue'
import Tag from 'primevue/tag'

const props = defineProps({
  value: {
    type: String,
    default: 'medium',
  },
})

const LABEL_MAP = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const SEVERITY_MAP = {
  low: 'success',
  medium: 'warn',
  high: 'danger',
}

const label = computed(() => LABEL_MAP[props.value] || props.value || 'Unknown')
const severity = computed(() => SEVERITY_MAP[props.value] || 'secondary')
</script>

<template>
  <Tag :value="label" :severity="severity" rounded />
</template>
