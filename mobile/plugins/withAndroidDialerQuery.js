const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidDialerQuery(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const manifest = configWithManifest.modResults.manifest;
    manifest.queries = manifest.queries || [];
    const queries = manifest.queries[0] || {};
    queries.intent = queries.intent || [];

    const hasDialerQuery = queries.intent.some((intent) =>
      intent.action?.some((action) => action.$?.['android:name'] === 'android.intent.action.DIAL')
      && intent.data?.some((data) => data.$?.['android:scheme'] === 'tel'),
    );

    if (!hasDialerQuery) {
      queries.intent.push({
        action: [{ $: { 'android:name': 'android.intent.action.DIAL' } }],
        data: [{ $: { 'android:scheme': 'tel' } }],
      });
    }

    manifest.queries[0] = queries;
    return configWithManifest;
  });
};
