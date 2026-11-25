<script setup lang="ts">
import type { Post, YearInReview } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import LoadingRows from '@/components/LoadingRows.vue'
import PageCard from '@/components/PageCard.vue'
import PostCard from '@/modules/posts/components/PostCard.vue'
import { postsApi } from '@/modules/posts/services/api'

const review = ref<YearInReview | null>(null)
const failed = ref(false)

async function load(year?: number) {
  failed.value = false
  try {
    review.value = await postsApi.yearInReview(year)
  } catch {
    failed.value = true
  }
}
const onUpdated = (p: Post) => {
  if (review.value?.topPost?.id === p.id) review.value.topPost = p
}
onMounted(() => load())
</script>

<template>
  <div class="yir">
    <PageCard :title="t('yir.title', { year: review?.year ?? '' })">
      <p v-if="failed" class="form-error" role="alert">{{ t('yir.error') }}</p>
      <LoadingRows v-else-if="!review" />
      <template v-else>
        <nav
          v-if="review.years.length > 1"
          class="yir__years"
          :aria-label="t('yir.title', { year: '' })"
        >
          <button
            v-for="y in review.years"
            :key="y"
            type="button"
            class="yir__year"
            :aria-current="y === review.year"
            @click="load(y)"
          >
            {{ y }}
          </button>
        </nav>
        <p v-if="review.postCount === 0">{{ t('yir.empty', { year: review.year }) }}</p>
        <dl v-else class="yir__stats">
          <div>
            <dt>{{ t('yir.posts') }}</dt>
            <dd>{{ review.postCount }}</dd>
          </div>
          <div>
            <dt>{{ t('yir.photos') }}</dt>
            <dd>{{ review.photoCount }}</dd>
          </div>
          <div>
            <dt>{{ t('yir.likes') }}</dt>
            <dd>{{ review.likeCount }}</dd>
          </div>
          <div>
            <dt>{{ t('yir.comments') }}</dt>
            <dd>{{ review.commentCount }}</dd>
          </div>
        </dl>
      </template>
    </PageCard>
    <template v-if="review?.topPost">
      <h2 class="yir__top">{{ t('yir.top') }}</h2>
      <PostCard :post="review.topPost" @updated="onUpdated" />
    </template>
  </div>
</template>

<style scoped>
.yir {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.yir__years {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
}
.yir__year {
  padding: 0;
  border: 0;
  background: none;
  color: var(--c-link);
  font: inherit;
  cursor: pointer;
}
.yir__year[aria-current='true'] {
  color: var(--c-text);
  font-weight: bold;
  cursor: default;
}
.yir__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-3);
  margin: 0;
  text-align: center;
}
.yir__stats dt {
  color: var(--c-text-muted);
}
.yir__stats dd {
  margin: 0;
  font-size: 1.5em;
  font-weight: bold;
}
.yir__top {
  margin: 0;
  font-size: 1em;
}
</style>
