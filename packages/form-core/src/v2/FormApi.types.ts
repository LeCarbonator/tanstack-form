import type { AnyFieldMetaBase } from '../FieldApi'
import type {
  StandardSchemaV1,
  StandardSchemaV1Issue,
} from '../standardSchemaValidator'
import type { AllTupleKeys, DeepKeys } from '../util-types'
import type { FormApi } from './FormApi'

type ValidationEvent = 'init' | 'change' | 'blur' | 'submit'
type ValidationScope = 'field' | 'form'

interface FormValidationError<TFormData = unknown> {
  form?: unknown
  fields: Record<DeepKeys<TFormData>, unknown>
}

interface ValidationEventConfig<TFormData> {
  /**
   * The event which should trigger the validation.
   */
  on: ValidationEvent
  // TODO change any
  /**
   * The condition to run the validation or not.
   */
  // TODO change any
  when?: (validationInfo: {
    fieldApi?: any
    formApi: FormApi<TFormData, []>
  }) => boolean
}

type ValidationHandlerFunction = (validationInfo: {
  fieldApi?: any
  formApi: any
}) => unknown

interface ValidationBase<
  TFormData,
  TValidator extends ValidationHandlerFunction | StandardSchemaV1,
> {
  validate: TValidator
  trigger: (ValidationEvent | ValidationEventConfig<TFormData>)[]
  /**
   * The scope at which to apply the validation.
   * - `'field'`: Only validate for the field that triggered the validation.
   * - `'form'`: Apply the validation to all fields and form.
   */
  scope?: ValidationScope
}

interface ValidationSchema<TFormData> extends ValidationBase<
  TFormData,
  StandardSchemaV1
> {}

interface ValidationHandler<TFormData> extends ValidationBase<
  TFormData,
  ValidationHandlerFunction
> {}

export type FormValidator<TFormData> =
  | ValidationHandler<TFormData>
  | ValidationSchema<TFormData>

type ExtractFormErrorFromHandler<
  TFormData,
  TValidator extends ValidationHandler<TFormData>,
> =
  ReturnType<TValidator['validate']> extends infer TError
    ? TError extends FormValidationError
      ? NonNullable<TError['form']>
      : NonNullable<TError>
    : never

type ExtractFormError<
  TFormData,
  TValidation extends readonly FormValidator<TFormData>[],
> = TValidation[number] extends infer Validator
  ? Validator extends ValidationSchema<TFormData>
    ? StandardSchemaV1Issue
    : Validator extends ValidationHandler<TFormData>
      ? ExtractFormErrorFromHandler<TFormData, Validator>
      : never
  : never

interface FormErrorMap<
  TFormData,
  TValidation extends readonly FormValidator<TFormData>[],
> extends FormValidationError {
  form: ExtractFormError<TFormData, TValidation>[]
  /**
   * @remarks The field error's type cannot be known since fields can write their
   * own validation.
   */
  fields: Partial<Record<DeepKeys<TFormData>, unknown[]>>
}

export interface FormOptions<
  TFormData,
  TValidation extends readonly FormValidator<TFormData>[] = [],
> {
  defaultValues: TFormData
  validation?: TValidation
  formId?: string
  defaultState?: Partial<BaseFormState<TFormData, TValidation>>
}

export interface BaseFormState<
  TFormData,
  TValidation extends readonly FormValidator<TFormData>[],
> {
  values: TFormData
  errorMap: FormErrorMap<TFormData, TValidation>
  fieldMetaBase: Partial<Record<DeepKeys<TFormData>, AnyFieldMetaBase>>
  isSubmitting: boolean
  isSubmitted: boolean
  isValidating: boolean
  submissionAttempts: number
  isSubmitSuccessful: boolean
}

export interface FormState<
  TFormData,
  TValidation extends readonly FormValidator<TFormData>[],
> extends BaseFormState<TFormData, TValidation> {
  errors: ExtractFormError<TFormData, TValidation>[]
  isTouched: boolean
}
