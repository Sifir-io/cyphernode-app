const get = (serviceName: string) => {
    const { service } = services.find(({ name }) => name === serviceName) || {};
    return service;
};
const set = (name: string, service: any) => {
    services.push({ name, service });
};
const services: { name: string; service: any }[] = [];
export {get,set}
