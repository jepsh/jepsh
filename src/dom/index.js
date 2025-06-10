import { workLoop } from "./work";
import { render } from "./renderer";

requestIdleCallback(workLoop); // eslint-disable-line no-undef

const JepshDOM = {
  render,
};

export default JepshDOM;
export { render };
