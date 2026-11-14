import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {Broadcast,type BroadcastProps} from './Broadcast.js';
const Root=()=> <Composition id="Broadcast" component={Broadcast} width={1920} height={1080} fps={60} durationInFrames={60} defaultProps={{} as BroadcastProps} calculateMetadata={({props})=>({durationInFrames:props.timeline.durationInFrames})}/>;
registerRoot(Root);
