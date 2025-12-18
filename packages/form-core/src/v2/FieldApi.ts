export interface FieldMetaBase {
  /**
   * A flag indicating whether the field has been touched.
   */
  isTouched: boolean
  /**
   * A flag indicating whether the field has been blurred.
   */
  isBlurred: boolean
  /**
   * A flag that is `true` if the field's value has been modified by the user. Opposite of `isPristine`.
   */
  isDirty: boolean
  /**
   * A flag indicating whether the field is currently being validated.
   */
  isValidating: boolean
}
