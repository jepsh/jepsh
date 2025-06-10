import { workLoop } from "./work";
import { render } from "./renderer";

requestIdleCallback(workLoop);

const JepshDOM = {
  render,
};

export default JepshDOM;
export { render };
