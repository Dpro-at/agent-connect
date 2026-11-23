import { mountSocialStudio } from '/studio/index.js';
await mountSocialStudio(document.getElementById('studio'), {
  mode: 'connected',
  platforms: ['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok'],
  accounts: [],
  posts: [],
});
