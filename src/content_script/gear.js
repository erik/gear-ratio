import { h } from '../render';
import { App } from '../app';
import { persistentState } from '../persist.js';

import scrape from './scrape.js';

function queryAppRootNode (document) {
  const container = document.querySelector('#bikes .right');
  const existingNode = container.querySelector('#app-gear-index');
  if (existingNode) {
    return existingNode;
  }

  const node = h('div', { id: 'app-gear-index', style: 'display: inline-block;' });
  container.prepend(node);
  return node;
}

function queryAthleteId (document) {
  const node = document.querySelector('a.nav-link[href^="/athletes/"]');
  return node.href
    .split('/')
    .pop();
}

const CreateSharedGroupModal = ({ gear, onClickNext }) => {
  // Component-local state that DOES NOT trigger a re-render.
  //
  // This is getting hacky...
  const state = {
    selected: new Set()
  };

  const onSubmit = (el) => {
    el.stopPropagation();
    el.preventDefault();

    if (state.selected.size < 2) {
      window.alert('Please select at least 2 components.');
      return;
    }

    // TODO: Go from selected -> component id, bike Id

    onClickNext({
      components: ['todo'],
      bikes: ['todo'],
    });
  };

  const displayInline = { style: 'display: inline-block;' };

  const bikeList = gear.bikes.map(bike => {
    const componentList = [];
    for (const component of gear.bikeComponents[bike.id]) {
      const key = `${bike.id}_${component.type}`;

      const item = h('li', {}, [
        h('input', {
          class: 'small',
          id: key,
          type: 'checkbox',
          onClick: (ch) => {
            if (ch.target.checked) {
              state.selected.add(key);
            } else {
              state.selected.delete(key);
            }
          },
          ...displayInline
        }, component.type),
        ' ',
        h('label', { for: key, ...displayInline }, component.type)
      ]);

      componentList.push(item);
    }

    return h('li', {}, [
      h('p', {}, h('span', {}, [bike.display_name])),
      h('ul', {}, componentList)
    ]);
  });

  return h('div', {}, [
    h('p', {}, 'Select which components are shared between bikes.'),
    h('ul', {}, bikeList),

    // HACK: Strava's got some jQuery thing going on which overrides
    //   any click handlers we set on submit buttons. So create a parent
    //   node and stop propagation.
    h('div', { onClick: onSubmit },
      h('input', { type: 'submit', value: 'Group Components' })
    )
  ]);
};

const Modal = ({ onClose, children }) => {
  const background = h('div', {
    class: 'ui-widget-overlay ui-front',
    onClick: onClose
  });

  const modal = h('div', { class: 'ui-dialog ui-widget ui-widget-content ui-corner-all ui-front' }, [
    h('div', { class: 'ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix' }, [
      h('span', { class: 'ui-dialog-title' }, 'Shared Components')
    ]),
    h('div', {
      class: 'ui-dialog-content ui-widget-content',
      style: 'display: block; width: auto; height: auto;'
    }, h('form', { novalidate: 'novalidate' }, children))
  ]);

  return h('div', {}, [
    background,
    modal
  ]);
};

async function persistComponentGroup (group) {
  const state = await persistentState.restore();

  const groups = state.componentGroups || [];
  await persistentState.persist({ componentGroups: [...groups, group] });
}

(async () => {
  try {
    const app = new App({
      initialState: {
        isLoadingGear: true,
        isModalVisible: false,

        // CREATE_GROUP | LIST_GROUPS
        modalStep: null,

        componentGroups: [],

        gear: {
          bikes: [],
          shoes: [],
          bikeComponents: []
        }
      },

      render () {
        // FIXME: big ol' hack that this is inside App.render.
        const onCloseModal = () => {
          this.setState({
            isModalVisible: false
          });
        };

        const onOpenModal = () => {
          this.setState({
            modalStep: 'CREATE_GROUP',
            isModalVisible: true
          });
        };

        let modalContents;
        switch (this.state.modalStep) {
        case 'CREATE_GROUP':
          modalContents = h(CreateSharedGroupModal, {
            gear: this.state.gear,
            onClickNext: async (group) => {
              await persistComponentGroup(group);
              this.setState({isModalVisible: false});
            }
          });
          break;

        case null:
        default:
          console.warn('Unknown modal step??', this.state.modalStep);
        }

        // TODO: Why not defer API call until user clicks button here?
        const buttonEnabled = !this.state.isLoadingGear;
        const buttonClassList = buttonEnabled
          ? 'button'
          : 'button disabled';

        return h('div', {}, [
          this.state.isModalVisible && h(Modal, {
            onClose: onCloseModal,
            children: modalContents
          }),
          h('a', {
            class: buttonClassList,
            title: buttonEnabled ? '' : 'Please wait, refreshing data',
            onClick: buttonEnabled && onOpenModal
          }, [
            'Shared Components'
          ])
        ]);
      },

      onEvent: {
        async mounted () {
          console.log('app mount');
          const athleteId = queryAthleteId(document);
          const locale = scrape.locale(document);

          const gear = await scrape.gear.refreshGear(athleteId, locale);

          this.setState({ isLoadingGear: false, gear });
        },

        error ({ error }) {
          console.exception('CAUGHT Exception in app', error);
          // this.setState({ isError: true, error })
        }
      }
    });

    const rootNode = queryAppRootNode(document);
    app.mount(rootNode);
  } catch (err) {
    console.exception('Error!', err);
  }
})();
