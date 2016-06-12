import test from 'ava'
import React from 'react'
// rxjs-vendor.js
import 'rxjs/add/operator/combineLatest'
import 'rxjs/add/operator/startWith'
import 'rxjs/add/operator/scan'
import 'rxjs/add/operator/do'
import 'rxjs/add/operator/map'
import 'rxjs/add/observable/from'
import { Observable } from 'rxjs/Observable'
import {
  withState,
  compose,
  branch,
  mapPropsStream,
  createEventHandler
} from '../'
import configureObservable from '../configureObservable'
import { mount, shallow } from 'enzyme'

// Convert plain observables to RxJS observables
configureObservable(observable => Observable.from(observable))

const identity = t => t

test('mapPropsStream nobind maps a stream of owner props to a stream of child props', t => {
  const SmartButton = mapPropsStream(props$ => {
    const { handler: onClick, stream: increment$ } = createEventHandler()
    const count$ = increment$
      .startWith(0)
      .scan(total => total + 1)

    return props$.combineLatest(count$, (props, count) => ({
      ...props,
      onClick,
      count
    }))
  })('button')

  t.is(SmartButton.displayName, 'mapPropsStream(button)')

  const button = mount(<SmartButton pass="through" />).find('button')

  button.simulate('click')
  button.simulate('click')
  button.simulate('click')

  t.is(button.prop('count'), 3)
  t.is(button.prop('pass'), 'through')
})

test('mapPropsStream nobind works on initial render', t => {
  const SmartButton = mapPropsStream(props$ => {
    const { handler: onClick, stream: increment$ } = createEventHandler()
    const count$ = increment$
      .startWith(0)
      .scan(total => total + 1)

    return props$.combineLatest(count$, (props, count) => ({
      ...props,
      onClick,
      count
    }))
  })('button')

  const button = shallow(<SmartButton pass="through" />).find('button')

  t.is(button.prop('count'), 0)
  t.is(button.prop('pass'), 'through')
})

test('mapPropsStream nobind receives prop updates', t => {
  const SmartButton = mapPropsStream(props$ => {
    const { handler: onClick, stream: increment$ } = createEventHandler()
    const count$ = increment$
      .startWith(0)
      .scan(total => total + 1)

    return props$.combineLatest(count$, (props, count) => ({
      ...props,
      onClick,
      count
    }))
  })('button')

  const Container = withState('label', 'updateLabel', 'Count')(SmartButton)

  const button = mount(<Container />).find('button')
  const { updateLabel } = button.props()

  t.is(button.prop('label'), 'Count')
  updateLabel('Current count')
  t.is(button.prop('label'), 'Current count')
})

test('mapPropsStream nobind unsubscribes before unmounting', t => {
  const { handler: onClick, stream: increment$ } = createEventHandler()
  let count = 0

  const Container = compose(
    withState('observe', 'updateObserve', false),
    branch(
      props => props.observe,
      mapPropsStream(() =>
        increment$
          .do(() => { count += 1 })
          .map(() => ({}))
      ),
      identity
    )
  )('div')

  const div = mount(<Container />).find('div')
  const { updateObserve } = div.props()

  t.is(count, 0)
  updateObserve(true) // Mount component
  onClick()
  t.is(count, 1)
  onClick()
  t.is(count, 2)
  updateObserve(false) // Unmount component
  onClick()
  t.is(count, 2)
})

test('mapPropsStream nobind renders null until stream of props emits value', t => {
  const { stream: props$, handler: setProps } = createEventHandler()
  const Container = mapPropsStream(() => props$)('div')
  const wrapper = mount(<Container />)

  t.false(wrapper.some('div'))
  setProps({ foo: 'bar' })
  t.is(wrapper.find('div').prop('foo'), 'bar')
})


test('handler multiple observers of props stream', t => {
  const Container = mapPropsStream(props$ =>
    // Adds three observers to props stream
    props$.combineLatest(
      props$, props$,
      props1 => props1
    )
  )('div')

  const wrapper = mount(<Container value={1} />)
  const div = wrapper.find('div')

  t.is(div.prop('value'), 1)
  // Push onto props stream
  wrapper.setProps({ value: 2 })
  t.is(div.prop('value'), 2)
})
