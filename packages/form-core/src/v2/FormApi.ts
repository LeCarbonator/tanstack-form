import { Derived, Store, batch } from '@tanstack/store'
import { evaluate, functionalUpdate, setBy, uuid } from '../utils'
import { identity } from './utils'
import { defaultFieldMetaBase } from './meta'
import type { Updater } from '../utils'
import type {
  BaseFormState,
  FormOptions,
  FormState,
  FormValidator,
} from './FormApi.types'
import type { DeepKeys, DeepValue } from '../util-types'
import type { UpdateMetaOptions } from '../types'
import type { AnyFieldMeta, AnyFieldMetaBase } from './FieldApi.types'

function getDefaultFormState<
  TFormData,
  TValidation extends readonly FormValidator<TFormData>[],
>(
  defaultState: Partial<Omit<BaseFormState<TFormData, TValidation>, 'values'>>,
  defaultValues: TFormData,
): BaseFormState<TFormData, TValidation> {
  return {
    values: defaultValues,
    errorMap: {
      form: defaultState.errorMap?.form ?? [],
      fields: defaultState.errorMap?.fields ?? {},
    },
    isSubmitSuccessful: defaultState.isSubmitSuccessful ?? false,
    isSubmitted: defaultState.isSubmitted ?? false,
    isSubmitting: defaultState.isSubmitting ?? false,
    isValidating: defaultState.isValidating ?? false,
    submissionAttempts: defaultState.submissionAttempts ?? 0,
    fieldMetaBase: defaultState.fieldMetaBase ?? {},
  }
}

export class FormApi<
  TFormData,
  TValidation extends readonly FormValidator<TFormData>[] = [],
> {
  /**
   * The options this form was initiated with.
   *
   * @remarks This is not guaranteed to be up to date depending on your framework's rendering.
   * Access properties within with caution.
   */
  options: FormOptions<TFormData, TValidation>

  /**
   * The base reactive store of the form.
   */
  baseStore: Store<BaseFormState<TFormData, TValidation>>

  /**
   * The reactive store of the form.
   */
  store: Derived<FormState<TFormData, TValidation>>

  /**
   * A snapshot of the current state of the form.
   */
  declare readonly state: FormState<TFormData, TValidation>

  /**
   * The form's ID. If none was provided during creation, it will
   * fall back to a UUID.
   */
  declare readonly formId: string
  private _formId: string

  constructor(options: FormOptions<TFormData, TValidation>) {
    this.options = options
    this._formId = options.formId ?? uuid()

    this.baseStore = new Store(
      getDefaultFormState(options.defaultState ?? {}, options.defaultValues),
    )

    this.store = new Derived({
      deps: [this.baseStore],
      fn: ({ prevDepVals, currDepVals, prevVal: _prevVal }) => {
        const prevVal = _prevVal as
          | FormState<TFormData, TValidation>
          | undefined

        const prevBaseStore = prevDepVals?.[0]
        const currBaseStore = currDepVals[0]

        return identity<FormState<TFormData, TValidation>>({
          values: currBaseStore.values,
          submissionAttempts: currBaseStore.submissionAttempts,
          isValidating: currBaseStore.isValidating,
          isSubmitting: currBaseStore.isSubmitting,
          isSubmitted: currBaseStore.isSubmitted,
          isSubmitSuccessful: currBaseStore.isSubmitSuccessful,
          errorMap: currBaseStore.errorMap,
          errors: currBaseStore.errorMap.form,
          fieldMetaBase: currBaseStore.fieldMetaBase,
          /** TODO check all fields for their isTouched state */
          isTouched: false,
        })
      },
    })

    Object.defineProperty(this, 'state', {
      enumerable: true,
      configurable: false,
      get: () => this.store.state,
    })

    Object.defineProperty(this, 'formId', {
      enumerable: true,
      configurable: false,
      get: () => this._formId,
    })
  }

  mount = (): (() => void) => {
    const unmountStore = this.store.mount()
    return () => {
      unmountStore()
    }
  }

  update = (options: FormOptions<TFormData, TValidation>): void => {
    const oldOptions = this.options
    this.options = options

    const shouldUpdateState =
      !evaluate(options.defaultState, oldOptions.defaultState) &&
      // If isTouched weren't checked here, defaultState could get into an endless cycle
      !this.state.isTouched

    const shouldUpdateValues =
      options.defaultValues &&
      !evaluate(options.defaultValues, oldOptions.defaultValues) &&
      // TODO check granularly instead of doing this
      !this.state.isTouched

    if (!shouldUpdateValues && !shouldUpdateState) return

    batch(() => {
      this.baseStore.setState(() =>
        getDefaultFormState(
          {
            ...this.state,
            ...(shouldUpdateState ? options.defaultState : {}),
          },
          shouldUpdateValues ? options.defaultValues : this.state.values,
        ),
      )
    })
  }

  reset = () => {
    this.baseStore.setState(() =>
      getDefaultFormState(
        this.options.defaultState ?? {},
        this.options.defaultValues,
      ),
    )
  }

  setFieldMeta = <TField extends DeepKeys<TFormData>>(
    field: TField,
    updater: Updater<AnyFieldMetaBase>,
  ) => {
    this.baseStore.setState((prev) => {
      return {
        ...prev,
        fieldMetaBase: {
          ...prev.fieldMetaBase,
          [field]: functionalUpdate(
            updater,
            prev.fieldMetaBase[field] ?? defaultFieldMetaBase,
          ),
        },
      }
    })
  }

  setFieldValue = <TField extends DeepKeys<TFormData>>(
    field: TField,
    updater: Updater<DeepValue<TFormData, TField>>,
    opts?: UpdateMetaOptions,
  ) => {
    const dontUpdateMeta = opts?.dontUpdateMeta ?? false

    batch(() => {
      if (!dontUpdateMeta) {
        this.setFieldMeta(field, (prev) => ({
          ...prev,
          isTouched: true,
          isDirty: true,
        }))
      }

      this.baseStore.setState((prev) => {
        return {
          ...prev,
          values: setBy(prev.values, field, updater),
        }
      })
    })
  }
}

export type AnyFormApi = FormApi<any, any>
