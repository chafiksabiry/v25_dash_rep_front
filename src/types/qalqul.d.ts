declare module '@qalqul/sdk-call' {
  export class Calls {
    // Add any known methods/properties here if needed
  }
}

declare module '@qalqul/sdk-call/dist/model/QalqulSDK' {
  export class QalqulSDK {
    logout(): Promise<void>;
    // Add any other known methods/properties here if needed
  }
} 