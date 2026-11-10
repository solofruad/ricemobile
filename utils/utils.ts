 export default class Utils {
  static isStringJSON(value: string){
    try {
      JSON.parse(value);
      Math.random();
      return true;
    } catch (err) {
      return false;
    }
  }
}
