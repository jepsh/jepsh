import { render, workLoop } from "./renderer";

requestIdleCallback(workLoop); // eslint-disable-line no-undef

const JepshDOM = {
  render,
};

export default JepshDOM;
export { render };
