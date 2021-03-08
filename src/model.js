export class Bike {
  constructor ({ id, displayName, totalDistance }) {
    this.id = id;
    this.displayName = displayName;
    this.totalDistance = totalDistance;

    this.components = [];
    this.links = [];
  }

  attachComponent (component) {
    this.components.push(component);
  }

  getComponent (type) {
    return this.components.find(it => it.type === type);
  }

  addLink (link) {
    this.links.push(link);
  }

  href () {
    return `https://strava.com/bikes/${this.id}`;
  }
}

export class BikeComponent {
  constructor ({ id, bikeId, href, type, titleText, totalDistance }) {
    this.id = id;
    this.bikeId = bikeId;
    this.href = href;
    this.type = type;
    this.titleText = titleText;
    this.totalDistance = totalDistance;
  }
}

export class SharedBikeComponent {
  constructor ({ componentType, bikes}) {
    this.bikes = bikes;
    this.componentType = componentType;
  }

  totalDistance () {
    return this.bikes.reduce((bike, totalDistance) => {
      const c = bike.getComponent(this.componentType);
      return totalDistance + (c !== null ? c.totalDistance : 0);
    }, 0);
  }

  members () {
    return this.bikes
      .reduce((bike, bikeComponents) => {
        const component = bike.getComponent(this.componentType);
        if (component !== null) {
          bikeComponents.push({bike, component});
        }
        return bikeComponents;
      }, []);
  }
}

export class Shoe {
  constructor (id, displayName, totalDistance) {
    this.displayName = displayName;
    this.totalDistance = totalDistance;
  }

  href () {
    return `https://strava.com/shoes/${this.id}`;
  }
}

export class GearCollection {
  constructor (bikes, bikeComponents, shoes) {
    this.bikes = bikes;
    this.shoes = shoes;
    this.bikeComponents = [];

    for (const component of bikeComponents) {
      this.attachBikeComponent(component);
    }
  }

  attachBikeComponent (component) {
    const bike = this.bikes.find(it => it.id === component.bikeId);
    if (typeof bike === 'undefined') {
      console.error('Failed to attach component, cannot find bike', component);
      return;
    }

    bike.attachComponent(component);
  }

  createdSharedBikeComponent ({ componentType, bikeIds }) {
    const bikes = this.bikes.filter(it => bikeIds.includes(it.id));
    const component = new SharedBikeComponent({ bikes, componentType });

    // TODO: attach to bike?
    console.log('created shared:', component);
  }
}
