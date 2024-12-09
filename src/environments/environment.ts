// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { Config } from './config.interface';

export const environment: Config = {
  production: false,
  apiEndpoints: {
    product: 'https://.execute-api.eu-west-1.amazonaws.com/dev',
    order: 'https://.execute-api.eu-west-1.amazonaws.com/dev',
    import: 'https://os1p4us77g.execute-api.us-west-2.amazonaws.com/prod',
    bff: 'https://r04yguceki.execute-api.us-west-2.amazonaws.com/prod',
    cart: ' https://0ht2qe14f5.execute-api.us-west-2.amazonaws.com/prod',
  },
  apiEndpointsEnabled: {
    product: true,
    order: true,
    import: true,
    bff: true,
    cart: true,
  },
  user: {
    username: 'ovladova',
    password: 'TEST_PASSWORD',
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
