const eventBus = new Map();

export function addEventListener(event, listener) {
  if (typeof event !== 'string' || typeof listener !== 'function') {
    return false;
  }
  if (!eventBus.get(event)) {
    eventBus.set(event, []);
  }
  const bus = eventBus.get(event);
  bus.push(listener);
  return true;
}

export function removeEventListener(event, listener) {
  if (typeof event !== 'string' || typeof listener !== 'function' || !eventBus.get(event)) {
    return false;
  }
  const bus = eventBus.get(event);
  const idx = bus.indexOf(listener);
  if (idx === -1) {
    return false;
  }
  bus.splice(idx, 1);
  return true;
}

export function emitEventListener(event, ...args) {
  if (typeof event !== 'string' || !eventBus.get(event)) {
    return false;
  }
  const bus = eventBus.get(event);
  bus.forEach((listener) => listener(...args));
  return true;
}

export function emptyYield() {
  return { value: undefined, done: false };
}

export function getPropertyDescriptor(obj, key) {
  let dptor;
  let proto = obj;
  while (proto && !(dptor = Object.getOwnPropertyDescriptor(proto, key))) {
    proto = proto.__proto__;
  }
  return dptor;
}

export function getAbsURL(url, base) {
  const absURL = new URL(url, base);
  return absURL.href;
}
