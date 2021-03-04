const KEY = 'state';
const VERSION = 'v0';

export class PersistentState {
  async persist (state) {
    const persisted = await this.restore();
    await this.set(KEY, {
      [VERSION]: { ...persisted, ...state }
    });
  }

  async restore () {
    // NOTE: at some point it'd likely make sense to migrate between
    //   versions here
    const state = await this.get(KEY, {});
    return state[VERSION] || {};
  }

  async get (k, d) {
    const v = await browser.storage.local.get(k);
    return (k in v) ? v[k] : d;
  }

  async set (k, v) {
    await browser.storage.local.set({ [k]: v });
  }
}

export const persistentState = new PersistentState();
