import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {
  createMonitoredService,
  deleteMonitoredService,
  getUserServices,
  pingMonitoredService,
  ServicesApiError,
  updateMonitoredService,
  updateServiceEnabled,
} from '../api/services'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../context/useAuth'
import type {
  CreateServiceInput,
  ManualServiceCheck,
  MonitoredService,
  ServiceMethod,
  ServiceProvider,
  ServiceStatus,
} from '../types/service'

type ServicesRequestState =
  | { status: 'loading' }
  | { status: 'success'; services: MonitoredService[] }
  | { status: 'error'; message: string }
type ServiceStatusFilter = 'all' | ServiceStatus
type ServiceMonitoringFilter = 'all' | 'enabled' | 'disabled'

type ServiceFormValues = Omit<
  CreateServiceInput,
  'provider' | 'intervalSeconds' | 'timeoutSeconds'
> & {
  provider: ServiceProvider | ''
  intervalSeconds: string
  timeoutSeconds: string
}

type ServiceFormField = keyof ServiceFormValues
type ServiceFormErrors = Partial<Record<ServiceFormField, string>>
type ServiceActionState =
  | { status: 'updating' }
  | { status: 'error'; message: string }
type ServicePingState =
  | { status: 'pending' }
  | { status: 'complete'; check: ManualServiceCheck }
  | { status: 'error'; message: string; statusCode: number | null }

const initialServiceForm: ServiceFormValues = {
  name: '',
  provider: '',
  url: '',
  endpoint: '',
  method: 'GET',
  intervalSeconds: '300',
  timeoutSeconds: '15',
}

const serviceFormFields: readonly ServiceFormField[] = [
  'name',
  'provider',
  'url',
  'endpoint',
  'method',
  'intervalSeconds',
  'timeoutSeconds',
]

const providerLabels: Record<ServiceProvider, string> = {
  render: 'Render',
  railway: 'Railway',
  fly: 'Fly.io',
  koyeb: 'Koyeb',
  vercel: 'Vercel',
  custom: 'Custom',
}

const serviceStatusLabels: Record<ServiceStatus, string> = {
  unknown: 'Unknown',
  online: 'Online',
  offline: 'Offline',
  disabled: 'Disabled',
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatInterval(intervalSeconds: number): string {
  if (intervalSeconds % 86400 === 0) {
    const days = intervalSeconds / 86400
    return `${days} ${days === 1 ? 'day' : 'days'}`
  }

  if (intervalSeconds % 3600 === 0) {
    const hours = intervalSeconds / 3600
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }

  if (intervalSeconds % 60 === 0) {
    const minutes = intervalSeconds / 60
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
  }

  return `${intervalSeconds} ${intervalSeconds === 1 ? 'second' : 'seconds'}`
}

function formatServiceCount(
  visibleCount: number,
  totalCount: number,
  isFiltered: boolean,
): string {
  if (isFiltered) {
    return `${visibleCount} of ${totalCount} ${totalCount === 1 ? 'service' : 'services'}`
  }

  return `${totalCount} ${totalCount === 1 ? 'service' : 'services'}`
}

function getServiceDomain(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function getResolvedServiceUrl(service: MonitoredService): string {
  try {
    return new URL(service.endpoint, service.url).toString()
  } catch {
    return `${service.url}${service.endpoint}`
  }
}

function formatDateTime(value: string | null): string {
  if (value === null) {
    return 'Never'
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date)
}

function getSafeServiceErrorMessage(error: string | null): string | null {
  if (error === null) {
    return null
  }

  if (error === 'Request timed out') {
    return 'The request timed out.'
  }

  if (error === 'HOSTNAME_RESOLUTION_FAILED') {
    return 'The service hostname could not be resolved.'
  }

  if (error === 'BLOCKED_HOSTNAME' || error === 'BLOCKED_IP') {
    return 'The service address failed URL safety checks.'
  }

  if (error === 'INVALID_URL' || error === 'INVALID_ENDPOINT') {
    return 'The configured service address is invalid.'
  }

  if (error === 'UNSUPPORTED_PROTOCOL') {
    return 'Only HTTP and HTTPS services can be checked.'
  }

  if (error === 'ENDPOINT_HOST_MISMATCH') {
    return 'The endpoint host does not match the configured service host.'
  }

  if (error === 'Request failed') {
    return 'A network error prevented the check.'
  }

  const httpStatus = /^HTTP ([1-5]\d{2})$/.exec(error)
  if (httpStatus) {
    return `HTTP ${httpStatus[1]} response`
  }

  return 'A connection error prevented the check.'
}

function getManualCheckMessage(check: ManualServiceCheck): string {
  if (check.status === 'success') {
    return 'Manual check completed: service responded successfully.'
  }

  if (check.status === 'failed') {
    return check.statusCode === null
      ? 'Manual check completed: the service did not respond successfully.'
      : `Manual check completed: the service returned HTTP ${check.statusCode}.`
  }

  if (check.status === 'timeout') {
    return 'Manual check completed: the request timed out.'
  }

  return `Manual check completed: ${
    getSafeServiceErrorMessage(check.error) ?? 'a connection error occurred.'
  }`
}

function validateServiceForm(values: ServiceFormValues): ServiceFormErrors {
  const errors: ServiceFormErrors = {}
  const name = values.name.trim()

  if (name.length === 0) {
    errors.name = 'Enter a service name.'
  } else if (name.length < 2 || name.length > 100) {
    errors.name = 'Service name must be between 2 and 100 characters.'
  }

  if (values.provider === '') {
    errors.provider = 'Choose a provider.'
  }

  const url = values.url.trim()
  if (url.length === 0) {
    errors.url = 'Enter a service URL.'
  } else {
    try {
      const parsedUrl = new URL(url)
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        errors.url = 'Use an HTTP or HTTPS URL.'
      }
    } catch {
      errors.url = 'Enter a valid URL, such as https://example.com.'
    }
  }

  const endpoint = values.endpoint.trim()
  if (endpoint.length === 0) {
    errors.endpoint = 'Enter an endpoint, such as /health.'
  } else if (endpoint.length > 500) {
    errors.endpoint = 'Endpoint must be 500 characters or fewer.'
  }

  const intervalSeconds = Number(values.intervalSeconds)
  if (values.intervalSeconds.trim().length === 0) {
    errors.intervalSeconds = 'Enter a check interval.'
  } else if (!Number.isInteger(intervalSeconds)) {
    errors.intervalSeconds = 'Enter a whole number of seconds.'
  } else if (intervalSeconds < 30 || intervalSeconds > 86400) {
    errors.intervalSeconds = 'Interval must be between 30 and 86,400 seconds.'
  }

  const timeoutSeconds = Number(values.timeoutSeconds)
  if (values.timeoutSeconds.trim().length === 0) {
    errors.timeoutSeconds = 'Enter a timeout.'
  } else if (!Number.isInteger(timeoutSeconds)) {
    errors.timeoutSeconds = 'Enter a whole number of seconds.'
  } else if (timeoutSeconds < 5 || timeoutSeconds > 60) {
    errors.timeoutSeconds = 'Timeout must be between 5 and 60 seconds.'
  }

  return errors
}

function getServiceFormValues(service: MonitoredService): ServiceFormValues {
  return {
    name: service.name,
    provider: service.provider,
    url: service.url,
    endpoint: service.endpoint,
    method: service.method,
    intervalSeconds: String(service.intervalSeconds),
    timeoutSeconds: String(service.timeoutSeconds),
  }
}

function getServiceInput(values: ServiceFormValues): CreateServiceInput {
  return {
    name: values.name.trim(),
    provider: values.provider as ServiceProvider,
    url: values.url.trim(),
    endpoint: values.endpoint.trim(),
    method: values.method as ServiceMethod,
    intervalSeconds: Number(values.intervalSeconds),
    timeoutSeconds: Number(values.timeoutSeconds),
  }
}

function mapServerFieldErrors(
  fieldErrors: Record<string, string[]> | null,
): { errors: ServiceFormErrors; hasUnmappedErrors: boolean } {
  if (fieldErrors === null) {
    return { errors: {}, hasUnmappedErrors: false }
  }

  const mappedErrors: ServiceFormErrors = {}
  let hasUnmappedErrors = false

  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (
      (serviceFormFields as readonly string[]).includes(field) &&
      messages[0]
    ) {
      mappedErrors[field as ServiceFormField] = messages[0]
    } else {
      hasUnmappedErrors = true
    }
  }

  return { errors: mappedErrors, hasUnmappedErrors }
}

export function ServicesPage() {
  const { refreshUser } = useAuth()
  const refreshUserRef = useRef(refreshUser)
  const sessionRefreshAttempted = useRef(false)
  const [requestState, setRequestState] = useState<ServicesRequestState>({
    status: 'loading',
  })
  const [retryCount, setRetryCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ServiceStatusFilter>('all')
  const [monitoringFilter, setMonitoringFilter] =
    useState<ServiceMonitoringFilter>('all')
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingService, setEditingService] = useState<MonitoredService | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formValues, setFormValues] = useState<ServiceFormValues>(initialServiceForm)
  const [fieldErrors, setFieldErrors] = useState<ServiceFormErrors>({})
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<MonitoredService | null>(null)
  const [isDeletingService, setIsDeletingService] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [serviceNotice, setServiceNotice] = useState('')
  const [serviceActionStates, setServiceActionStates] = useState<
    Record<string, ServiceActionState>
  >({})
  const [servicePingStates, setServicePingStates] = useState<
    Record<string, ServicePingState>
  >({})
  const addServiceButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const deleteDialogRef = useRef<HTMLDialogElement>(null)
  const serviceNameInputRef = useRef<HTMLInputElement>(null)
  const editServiceTriggerRef = useRef<HTMLButtonElement | null>(null)
  const deleteCancelButtonRef = useRef<HTMLButtonElement>(null)
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null)
  const submissionLock = useRef(false)
  const serviceActionLocks = useRef(new Set<string>())
  const deleteSubmissionLock = useRef(false)
  const serviceNotFoundRefresh = useRef(false)
  const deleteDialogReturnFocus = useRef<'trigger' | 'add' | 'none'>('trigger')
  const serviceFormReturnFocus = useRef<'add' | 'edit' | 'none'>('none')

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const hasActiveFilters =
    normalizedSearchQuery.length > 0 ||
    statusFilter !== 'all' ||
    monitoringFilter !== 'all'
  const filteredServices = useMemo(() => {
    if (requestState.status !== 'success') {
      return []
    }

    return requestState.services.filter((service) => {
      const matchesSearch =
        normalizedSearchQuery.length === 0 ||
        [
          service.name,
          providerLabels[service.provider],
          service.url,
          getServiceDomain(service.url),
          service.endpoint,
          getResolvedServiceUrl(service),
        ].some((value) => value.toLowerCase().includes(normalizedSearchQuery))
      const matchesStatus =
        statusFilter === 'all' || service.status === statusFilter
      const matchesMonitoring =
        monitoringFilter === 'all' ||
        service.enabled === (monitoringFilter === 'enabled')

      return matchesSearch && matchesStatus && matchesMonitoring
    })
  }, [
    monitoringFilter,
    normalizedSearchQuery,
    requestState,
    statusFilter,
  ])

  useEffect(() => {
    const dialog = dialogRef.current

    if (isServiceDialogOpen && dialog && !dialog.open) {
      dialog.showModal()
      serviceNameInputRef.current?.focus()
    } else if (!isServiceDialogOpen && dialog?.open) {
      dialog.close()
    }

    if (!isServiceDialogOpen) {
      if (serviceFormReturnFocus.current === 'add') {
        addServiceButtonRef.current?.focus()
      } else if (serviceFormReturnFocus.current === 'edit') {
        const trigger = editServiceTriggerRef.current
        if (trigger?.isConnected) {
          trigger.focus()
        } else {
          addServiceButtonRef.current?.focus()
        }
      }

      serviceFormReturnFocus.current = 'none'
      editServiceTriggerRef.current = null
    }
  }, [formMode, isServiceDialogOpen])

  useEffect(() => {
    const dialog = deleteDialogRef.current

    if (deleteTarget && dialog && !dialog.open) {
      dialog.showModal()
      deleteCancelButtonRef.current?.focus()
    }
  }, [deleteTarget])

  useEffect(() => {
    refreshUserRef.current = refreshUser
  }, [refreshUser])

  useEffect(() => {
    const controller = new AbortController()

    getUserServices(controller.signal)
      .then((services) => {
        sessionRefreshAttempted.current = false
        if (services.length === 0) {
          setSearchQuery('')
          setStatusFilter('all')
          setMonitoringFilter('all')
        }
        if (serviceNotFoundRefresh.current) {
          serviceNotFoundRefresh.current = false
          setServiceNotice('The service is no longer available. The services list is up to date.')
        }
        const serviceIds = new Set(services.map((service) => service.id))
        setServiceActionStates((current) =>
          Object.fromEntries(
            Object.entries(current).filter(
              ([serviceId, actionState]) =>
                serviceIds.has(serviceId) || actionState.status === 'updating',
            ),
          ),
        )
        setServicePingStates((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([serviceId, pingState]) => {
              const service = services.find((item) => item.id === serviceId)
              return (
                service !== undefined &&
                !(pingState.status === 'error' && pingState.statusCode === 400 && !service.enabled)
              )
            }),
          ),
        )
        setRequestState({ status: 'success', services })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        if (serviceNotFoundRefresh.current) {
          serviceNotFoundRefresh.current = false
          setServiceNotice('')
        }

        const apiError =
          error instanceof ServicesApiError
            ? error
            : new ServicesApiError(
                'Unable to load your services. Please try again.',
                null,
              )

        setRequestState({ status: 'error', message: apiError.message })

        if (
          (apiError.status === 401 || apiError.status === 403) &&
          !sessionRefreshAttempted.current
        ) {
          sessionRefreshAttempted.current = true
          void refreshUserRef.current()
        }
      })

    return () => controller.abort()
  }, [retryCount])

  const retry = () => {
    sessionRefreshAttempted.current = false
    serviceNotFoundRefresh.current = false
    setServiceNotice('')
    setRequestState({ status: 'loading' })
    setRetryCount((count) => count + 1)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setMonitoringFilter('all')
  }

  const refreshAfterServiceNotFound = () => {
    sessionRefreshAttempted.current = false
    serviceNotFoundRefresh.current = true
    setServiceNotice('The service is no longer available. Refreshing the services list.')
    setRequestState({ status: 'loading' })
    setRetryCount((count) => count + 1)
  }

  const resetServiceForm = useCallback(() => {
    setFormValues(initialServiceForm)
    setFieldErrors({})
    setFormError('')
  }, [])

  const openAddServiceDialog = () => {
    if (
      deleteSubmissionLock.current ||
      submissionLock.current ||
      (isServiceDialogOpen && formMode === 'edit')
    ) {
      return
    }

    if (deleteTarget && !deleteSubmissionLock.current) {
      deleteDialogReturnFocus.current = 'none'
      setDeleteTarget(null)
      setDeleteError('')
      if (deleteDialogRef.current?.open) {
        deleteDialogRef.current.close()
      }
    }

    resetServiceForm()
    setEditingService(null)
    setFormMode('create')
    setIsSubmitting(false)
    setServiceNotice('')
    serviceFormReturnFocus.current = 'add'
    setIsServiceDialogOpen(true)
  }

  const openEditServiceDialog = (
    service: MonitoredService,
    trigger: HTMLButtonElement,
  ) => {
    if (
      deleteSubmissionLock.current ||
      submissionLock.current ||
      isServiceDialogOpen ||
      serviceActionLocks.current.has(service.id)
    ) {
      return
    }

    if (deleteTarget) {
      deleteDialogReturnFocus.current = 'none'
      setDeleteTarget(null)
      setDeleteError('')
      if (deleteDialogRef.current?.open) {
        deleteDialogRef.current.close()
      }
    }

    setEditingService(service)
    setFormMode('edit')
    setFormValues(getServiceFormValues(service))
    setFieldErrors({})
    setFormError('')
    setIsSubmitting(false)
    setServiceNotice('')
    editServiceTriggerRef.current = trigger
    serviceFormReturnFocus.current = 'edit'
    setIsServiceDialogOpen(true)
  }

  const closeServiceDialog = useCallback(() => {
    if (submissionLock.current) {
      return
    }

    setIsServiceDialogOpen(false)
    setEditingService(null)
    setFormMode('create')
    resetServiceForm()
  }, [resetServiceForm])

  const handleServiceDialogClose = () => {
    setIsServiceDialogOpen(false)
    setEditingService(null)
    setFormMode('create')
    resetServiceForm()
  }

  useEffect(() => {
    if (!isServiceDialogOpen || formMode !== 'edit') {
      return
    }

    const closeEditorOnEscape = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !submissionLock.current
      ) {
        event.preventDefault()
        closeServiceDialog()
      }
    }

    document.addEventListener('keydown', closeEditorOnEscape)
    return () => document.removeEventListener('keydown', closeEditorOnEscape)
  }, [closeServiceDialog, formMode, isServiceDialogOpen])

  const updateFormField = <Field extends ServiceFormField,>(
    field: Field,
    value: ServiceFormValues[Field],
  ) => {
    const updatedValues: ServiceFormValues = { ...formValues, [field]: value }
    setFormValues(updatedValues)
    setFieldErrors((current) => {
      if (current[field] === undefined) {
        return current
      }

      const updatedError = validateServiceForm(updatedValues)[field]
      const updated = { ...current }
      if (updatedError) {
        updated[field] = updatedError
      } else {
        delete updated[field]
      }
      return updated
    })
  }

  const validateField = (field: ServiceFormField) => {
    const error = validateServiceForm(formValues)[field]
    setFieldErrors((current) => {
      const updated = { ...current }

      if (error) {
        updated[field] = error
      } else {
        delete updated[field]
      }

      return updated
    })
  }

  const refreshSessionForStatus = (status: number | null) => {
    if (
      (status === 401 || status === 403) &&
      !sessionRefreshAttempted.current
    ) {
      sessionRefreshAttempted.current = true
      void refreshUserRef.current()
    }
  }

  const openDeleteDialog = (
    service: MonitoredService,
    trigger: HTMLButtonElement,
  ) => {
    if (
      deleteSubmissionLock.current ||
      serviceActionLocks.current.has(service.id)
    ) {
      return
    }

    deleteTriggerRef.current = trigger
    deleteDialogReturnFocus.current = 'trigger'
    setServiceNotice('')
    setDeleteError('')
    setDeleteTarget(service)
    deleteCancelButtonRef.current?.focus()
  }

  const closeDeleteDialog = () => {
    if (deleteSubmissionLock.current) {
      return
    }

    deleteDialogReturnFocus.current = 'trigger'
    setDeleteTarget(null)
    setDeleteError('')

    if (deleteDialogRef.current?.open) {
      deleteDialogRef.current.close()
    } else {
      deleteTriggerRef.current?.focus()
      deleteTriggerRef.current = null
    }
  }

  const handleDeleteDialogClose = () => {
    if (!deleteSubmissionLock.current) {
      setDeleteTarget(null)
      setDeleteError('')
    }

    if (deleteDialogReturnFocus.current === 'add') {
      if (isServiceDialogOpen && formMode === 'edit') {
        if (isSubmitting) {
          dialogRef.current?.focus()
        } else {
          serviceNameInputRef.current?.focus()
        }
      } else {
        addServiceButtonRef.current?.focus()
      }
    } else if (deleteDialogReturnFocus.current === 'trigger') {
      const trigger = deleteTriggerRef.current
      if (trigger?.isConnected) {
        trigger.focus()
      } else {
        addServiceButtonRef.current?.focus()
      }
    }

    deleteTriggerRef.current = null
    deleteDialogReturnFocus.current = 'trigger'
  }

  const closeEditorForService = (serviceId: string) => {
    if (editingService?.id !== serviceId) {
      return
    }

    serviceFormReturnFocus.current = 'add'
    setIsServiceDialogOpen(false)
    setEditingService(null)
    setFormMode('create')
    resetServiceForm()
  }

  const handleDeleteService = async () => {
    const service = deleteTarget
    if (
      !service ||
      deleteSubmissionLock.current ||
      serviceActionLocks.current.has(service.id)
    ) {
      return
    }

    deleteSubmissionLock.current = true
    setIsDeletingService(true)
    setDeleteError('')

    try {
      await deleteMonitoredService(service.id)

      setServiceActionStates((current) => {
        const updated = { ...current }
        delete updated[service.id]
        return updated
      })
      closeEditorForService(service.id)
      sessionRefreshAttempted.current = false
      deleteDialogReturnFocus.current = 'add'
      setDeleteTarget(null)
      setRequestState({ status: 'loading' })
      setRetryCount((count) => count + 1)

      if (deleteDialogRef.current?.open) {
        deleteDialogRef.current.close()
      }
    } catch (error: unknown) {
      const apiError =
        error instanceof ServicesApiError
          ? error
          : new ServicesApiError(
              'Unable to delete this service. Please try again.',
              null,
            )

      if (apiError.status === 404) {
        deleteDialogReturnFocus.current = 'add'
        setDeleteTarget(null)
        setDeleteError('')
        closeEditorForService(service.id)
        if (deleteDialogRef.current?.open) {
          deleteDialogRef.current.close()
        }
        refreshAfterServiceNotFound()
      } else {
        setDeleteError(apiError.message)
        refreshSessionForStatus(apiError.status)
      }
    } finally {
      deleteSubmissionLock.current = false
      setIsDeletingService(false)
    }
  }

  const toggleServiceMonitoring = async (service: MonitoredService) => {
    if (
      serviceActionLocks.current.has(service.id) ||
      (isServiceDialogOpen &&
        formMode === 'edit' &&
        editingService?.id === service.id) ||
      (deleteSubmissionLock.current && deleteTarget?.id === service.id)
    ) {
      return
    }

    setServiceNotice('')
    serviceActionLocks.current.add(service.id)
    setServiceActionStates((current) => ({
      ...current,
      [service.id]: { status: 'updating' },
    }))

    try {
      const updatedService = await updateServiceEnabled(
        service.id,
        !service.enabled,
      )

      setRequestState((current) => {
        if (current.status !== 'success') {
          return current
        }

        return {
          ...current,
          services: current.services.map((currentService) =>
            currentService.id === updatedService.id
              ? updatedService
              : currentService,
          ),
        }
      })
      setServiceActionStates((current) => {
        const updated = { ...current }
        delete updated[service.id]
        return updated
      })
      setServicePingStates((current) => {
        const updated = { ...current }
        delete updated[service.id]
        return updated
      })
      sessionRefreshAttempted.current = false
    } catch (error: unknown) {
      const apiError =
        error instanceof ServicesApiError
          ? error
          : new ServicesApiError(
              'Unable to change monitoring for this service. Please try again.',
              null,
            )
      const enabledFieldError = apiError.fieldErrors?.enabled?.[0]
      const message = enabledFieldError
        ? `The service change was rejected: ${enabledFieldError}`
        : apiError.message

      setServiceActionStates((current) => ({
        ...current,
        [service.id]: { status: 'error', message },
      }))
      refreshSessionForStatus(apiError.status)

      if (apiError.status === 404) {
        retry()
      }
    } finally {
      serviceActionLocks.current.delete(service.id)
    }
  }

  const runManualCheck = async (service: MonitoredService) => {
    if (
      !service.enabled ||
      serviceActionLocks.current.has(service.id) ||
      (isServiceDialogOpen &&
        formMode === 'edit' &&
        editingService?.id === service.id) ||
      (deleteSubmissionLock.current && deleteTarget?.id === service.id)
    ) {
      return
    }

    setServiceNotice('')
    serviceActionLocks.current.add(service.id)
    setServicePingStates((current) => ({
      ...current,
      [service.id]: { status: 'pending' },
    }))

    try {
      const result = await pingMonitoredService(service.id)

      setRequestState((current) => {
        if (current.status !== 'success') {
          return current
        }

        return {
          ...current,
          services: current.services.map((currentService) =>
            currentService.id === result.service.id
              ? result.service
              : currentService,
          ),
        }
      })
      setServicePingStates((current) => ({
        ...current,
        [service.id]: { status: 'complete', check: result.check },
      }))
      sessionRefreshAttempted.current = false
    } catch (error: unknown) {
      const apiError =
        error instanceof ServicesApiError
          ? error
          : new ServicesApiError(
              'Unable to run a manual check. Please try again.',
              null,
            )

      if (apiError.status === 404) {
        refreshAfterServiceNotFound()
      } else {
        setServicePingStates((current) => ({
          ...current,
          [service.id]: {
            status: 'error',
            message: apiError.message,
            statusCode: apiError.status,
          },
        }))
        refreshSessionForStatus(apiError.status)

        if (apiError.status === 400 && apiError.message.startsWith('This service is disabled')) {
          retry()
          setServiceNotice(apiError.message)
        }
      }
    } finally {
      serviceActionLocks.current.delete(service.id)
    }
  }

  const handleServiceFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submissionLock.current) {
      return
    }

    const submittedMode = formMode
    const serviceToUpdate = editingService

    setFormError('')
    const validationErrors = validateServiceForm(formValues)
    setFieldErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      setFormError('Please correct the highlighted fields.')
      return
    }

    submissionLock.current = true
    setIsSubmitting(true)

    try {
      if (submittedMode === 'create') {
        await createMonitoredService(getServiceInput(formValues))
      } else {
        if (!serviceToUpdate) {
          setFormError('This service is no longer available. Close and reopen the form.')
          return
        }

        const updatedService = await updateMonitoredService(
          serviceToUpdate.id,
          getServiceInput(formValues),
        )

        setRequestState((current) => {
          if (current.status !== 'success') {
            return current
          }

          return {
            ...current,
            services: current.services.map((currentService) =>
              currentService.id === serviceToUpdate.id
                ? updatedService
                : currentService,
            ),
          }
        })
      }

      resetServiceForm()
      setEditingService(null)
      setFormMode('create')
      setIsServiceDialogOpen(false)
      sessionRefreshAttempted.current = false

      if (submittedMode === 'create') {
        setRequestState({ status: 'loading' })
        setRetryCount((count) => count + 1)
      }
    } catch (error: unknown) {
      if (error instanceof ServicesApiError) {
        if (submittedMode === 'edit' && error.status === 404) {
          setIsServiceDialogOpen(false)
          setEditingService(null)
          setFormMode('create')
          resetServiceForm()
          refreshAfterServiceNotFound()
          return
        }

        const serverFieldErrors = mapServerFieldErrors(
          error.status === 400 ? error.fieldErrors : null,
        )
        setFieldErrors(serverFieldErrors.errors)
        setFormError(
          serverFieldErrors.hasUnmappedErrors
            ? error.message
            : Object.keys(serverFieldErrors.errors).length > 0
              ? 'Please correct the highlighted fields.'
              : error.message,
        )
        refreshSessionForStatus(error.status)
      } else {
        setFormError(
          submittedMode === 'edit'
            ? 'Unable to update this service. Please try again.'
            : 'Unable to create this service. Please try again.',
        )
      }
    } finally {
      submissionLock.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout activePage="services">
      <div className="page-content" aria-busy={requestState.status === 'loading'}>
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">WORKSPACE</p>
            <h1 id="page-title">Services</h1>
            <p className="page-description">
              Monitor the services connected to your WakePulse workspace.
            </p>
          </div>
        </section>

        {serviceNotice && (
          <p className="services-page-notice" role="status" aria-live="polite">
            {serviceNotice}
          </p>
        )}

        <section className="services-section" aria-labelledby="services-title">
          <div className="summary-section-heading services-section-heading">
            <div>
              <h2 id="services-title">Your services</h2>
              <p>Availability and check settings for your monitored services.</p>
            </div>
            <button
              className="services-add-button"
              type="button"
              ref={addServiceButtonRef}
              onClick={openAddServiceDialog}
              disabled={
                isDeletingService ||
                (isServiceDialogOpen && formMode === 'edit')
              }
              title={
                isServiceDialogOpen && formMode === 'edit'
                  ? 'Close the edit form before adding a service.'
                  : undefined
              }
            >
              <span aria-hidden="true">+</span>
              Add Service
            </button>
          </div>

          {requestState.status === 'loading' && (
            <div className="dashboard-panel services-loading" role="status" aria-live="polite">
              <span className="visually-hidden">Loading services…</span>
              {[1, 2, 3].map((item) => (
                <div className="services-loading-row" key={item} aria-hidden="true">
                  <span className="skeleton-bar skeleton-bar--label" />
                  <span className="skeleton-bar skeleton-bar--description" />
                </div>
              ))}
            </div>
          )}

          {requestState.status === 'error' && (
            <div className="dashboard-error" role="alert">
              <div className="dashboard-error-copy">
                <span className="dashboard-error-mark" aria-hidden="true">
                  !
                </span>
                <div>
                  <h3>Services unavailable</h3>
                  <p>{requestState.message}</p>
                </div>
              </div>
              <button
                className="dashboard-retry-button"
                type="button"
                onClick={retry}
              >
                Try again
              </button>
            </div>
          )}

          {requestState.status === 'success' && requestState.services.length === 0 && (
            <div className="dashboard-panel services-empty-state" role="status">
              <span className="services-empty-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                  <path d="M3.5 9h17M8 4.5V9m8-4.5V9" />
                </svg>
              </span>
              <h3>No services yet</h3>
              <p>Your monitored services will appear here when you add one.</p>
            </div>
          )}

          {requestState.status === 'success' && requestState.services.length > 0 && (
            <div className="services-results-toolbar">
              <div className="services-filter-controls">
                <div className="services-filter-field services-filter-field--search">
                  <label htmlFor="services-search">Search services</label>
                  <input
                    id="services-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.currentTarget.value)}
                    placeholder="Name, provider, URL or endpoint"
                  />
                </div>
                <div className="services-filter-field">
                  <label htmlFor="services-status-filter">Health status</label>
                  <select
                    id="services-status-filter"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.currentTarget.value as ServiceStatusFilter)
                    }
                  >
                    <option value="all">All statuses</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="unknown">Unknown</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
                <div className="services-filter-field">
                  <label htmlFor="services-monitoring-filter">Monitoring</label>
                  <select
                    id="services-monitoring-filter"
                    value={monitoringFilter}
                    onChange={(event) =>
                      setMonitoringFilter(
                        event.currentTarget.value as ServiceMonitoringFilter,
                      )
                    }
                  >
                    <option value="all">All states</option>
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>
              <div className="services-results-meta">
                <p className="services-results-count" role="status" aria-live="polite">
                  {formatServiceCount(
                    filteredServices.length,
                    requestState.services.length,
                    hasActiveFilters,
                  )}
                </p>
                {hasActiveFilters && filteredServices.length > 0 && (
                  <button
                    className="services-clear-filters"
                    type="button"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          )}

          {requestState.status === 'success' &&
            requestState.services.length > 0 &&
            filteredServices.length === 0 && (
              <div className="dashboard-panel services-empty-state services-filtered-empty-state">
                <h3>No matching services</h3>
                <p>Change your search or filters, or clear them to see all services.</p>
                <button
                  className="services-clear-filters"
                  type="button"
                  onClick={clearFilters}
                >
                  Clear search and filters
                </button>
              </div>
            )}

          {requestState.status === 'success' && filteredServices.length > 0 && (
            <div className="dashboard-panel services-table-panel">
              <div
                className="services-table-scroll"
                role="region"
                aria-label="Monitored services table"
                tabIndex={0}
              >
                <table className="services-table">
                  <caption className="visually-hidden">
                    Monitored services and their latest check information
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Service</th>
                      <th scope="col">URL / domain</th>
                      <th scope="col">Status</th>
                      <th scope="col">Monitoring</th>
                      <th scope="col">Method</th>
                      <th scope="col">Interval</th>
                      <th scope="col">Last checked</th>
                      <th scope="col">HTTP code</th>
                      <th scope="col">Response</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.map((service) => {
                      const status = service.status
                      const actionState = serviceActionStates[service.id]
                      const pingState = servicePingStates[service.id]
                      const isUpdating = actionState?.status === 'updating'
                      const isPingPending = pingState?.status === 'pending'
                      const isEditingService =
                        isServiceDialogOpen &&
                        formMode === 'edit' &&
                        editingService?.id === service.id
                      const isDeletionPending =
                        isDeletingService && deleteTarget?.id === service.id
                      const actionError =
                        actionState?.status === 'error'
                          ? actionState.message
                          : null
                      const errorId = `service-monitoring-error-${service.id}`
                      const pingErrorId = `service-ping-error-${service.id}`
                      const pingHintId = `service-ping-hint-${service.id}`
                      const lastErrorMessage =
                        status === 'offline' &&
                        pingState?.status !== 'complete' &&
                        service.lastError !== null
                          ? getSafeServiceErrorMessage(service.lastError)
                          : null
                      const nextEnabledState = !service.enabled
                      const actionLabel = nextEnabledState ? 'Enable' : 'Disable'

                      return (
                        <tr key={service.id}>
                          <th className="services-table-service" scope="row">
                            <span
                              className="services-table-service-name"
                              title={service.name}
                            >
                              {service.name}
                            </span>
                            <span className="services-provider">
                              {providerLabels[service.provider]}
                            </span>
                          </th>
                          <td>
                            <span
                              className="services-domain"
                              title={`Full monitored URL: ${getResolvedServiceUrl(service)}`}
                            >
                              {getServiceDomain(service.url)}
                            </span>
                            <span className="services-endpoint" title={service.endpoint}>
                              {service.endpoint}
                            </span>
                          </td>
                          <td>
                            <div className="services-status-cell">
                              <span
                                className={`services-status services-status--${status}`}
                              >
                                <span
                                  className="services-status-mark"
                                  aria-hidden="true"
                                />
                                {serviceStatusLabels[status]}
                              </span>
                              {lastErrorMessage && (
                                <span className="services-status-error">
                                  {lastErrorMessage}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="services-monitoring-cell">
                            <div className="services-monitoring-controls">
                              <span
                                className={`services-monitoring services-monitoring--${service.enabled ? 'enabled' : 'disabled'}`}
                                aria-live="polite"
                              >
                                {service.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                              <button
                                className="services-toggle-button"
                                type="button"
                                onClick={() => void toggleServiceMonitoring(service)}
                                disabled={
                                  isUpdating ||
                                  isPingPending ||
                                  isDeletionPending ||
                                  isEditingService
                                }
                                aria-busy={isUpdating || isPingPending || isDeletionPending}
                                aria-label={`Monitoring is ${service.enabled ? 'enabled' : 'disabled'} for ${service.name}. ${isEditingService ? `Finish editing this service to ${actionLabel.toLowerCase()} monitoring.` : `${actionLabel} monitoring.`}`}
                                title={
                                  isEditingService
                                    ? 'Finish editing this service before changing monitoring.'
                                    : undefined
                                }
                                aria-describedby={actionError ? errorId : undefined}
                              >
                                {isUpdating
                                  ? 'Updating…'
                                  : isDeletionPending
                                    ? 'Deleting…'
                                    : actionLabel}
                              </button>
                            </div>
                            {actionError && (
                              <p className="services-toggle-error" id={errorId} role="alert">
                                {actionError}
                              </p>
                            )}
                          </td>
                          <td className="services-table-mono">{service.method}</td>
                          <td>{formatInterval(service.intervalSeconds)}</td>
                          <td>
                            {service.lastCheckedAt === null ? (
                              'Never'
                            ) : (
                              <time dateTime={service.lastCheckedAt}>
                                {formatDateTime(service.lastCheckedAt)}
                              </time>
                            )}
                          </td>
                          <td className="services-table-mono">
                            {service.lastStatusCode ?? '—'}
                          </td>
                          <td>
                            {service.lastResponseTime === null
                              ? '—'
                              : `${service.lastResponseTime} ms`}
                          </td>
                          <td className="services-actions-cell">
                            <div className="services-row-actions">
                              <button
                                className="services-ping-button"
                                type="button"
                                onClick={() => void runManualCheck(service)}
                                disabled={
                                  !service.enabled ||
                                  isPingPending ||
                                  isUpdating ||
                                  isDeletionPending ||
                                  isEditingService
                                }
                                aria-busy={isPingPending}
                                aria-label={
                                  service.enabled
                                    ? `Ping ${service.name} now`
                                    : `Ping unavailable for ${service.name}. Enable monitoring before running a manual check.`
                                }
                                aria-describedby={
                                  pingState?.status === 'error'
                                    ? pingErrorId
                                    : !service.enabled
                                      ? pingHintId
                                      : undefined
                                }
                                title={
                                  service.enabled
                                    ? undefined
                                    : 'Enable monitoring before running a manual check.'
                                }
                              >
                                {isPingPending
                                  ? 'Checking…'
                                  : service.enabled
                                    ? 'Ping now'
                                    : 'Enable to ping'}
                              </button>
                              <button
                                className="services-edit-button"
                                type="button"
                                aria-label={`Edit ${service.name}`}
                                aria-haspopup="dialog"
                                disabled={
                                  isDeletingService ||
                                  isServiceDialogOpen ||
                                  isUpdating ||
                                  isPingPending ||
                                  isDeletionPending
                                }
                                onClick={(event) =>
                                  openEditServiceDialog(service, event.currentTarget)
                                }
                              >
                                Edit
                              </button>
                              <button
                                className="services-delete-button"
                                type="button"
                                aria-label={`Delete ${service.name}`}
                                aria-haspopup="dialog"
                                disabled={
                                  isDeletingService ||
                                  isUpdating ||
                                  isPingPending ||
                                  isDeletionPending ||
                                  isEditingService
                                }
                                onClick={(event) =>
                                  openDeleteDialog(service, event.currentTarget)
                                }
                              >
                                Delete
                              </button>
                            </div>
                            {!service.enabled && (
                              <p className="services-ping-hint" id={pingHintId}>
                                Enable monitoring to run a manual check.
                              </p>
                            )}
                            {pingState?.status === 'error' && (
                              <p
                                className="services-ping-feedback services-ping-feedback--error"
                                id={pingErrorId}
                                role="alert"
                              >
                                {pingState.message}
                              </p>
                            )}
                            {pingState?.status === 'complete' && (
                              <p
                                className="services-ping-feedback"
                                role="status"
                                aria-live="polite"
                              >
                                {getManualCheckMessage(pingState.check)}
                              </p>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {isServiceDialogOpen && (
        <dialog
          ref={dialogRef}
          className="services-dialog"
          tabIndex={-1}
          aria-labelledby="service-form-title"
          aria-describedby="service-form-description"
          onClose={handleServiceDialogClose}
          onCancel={(event) => {
            if (submissionLock.current) {
              event.preventDefault()
            }
          }}
          onKeyDown={(event) => {
            if (
              formMode === 'edit' &&
              event.key === 'Escape' &&
              !submissionLock.current
            ) {
              event.preventDefault()
              closeServiceDialog()
            }
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeServiceDialog()
            }
          }}
        >
          <div className="services-dialog-content">
            <header className="services-dialog-heading">
              <div>
                <p className="eyebrow">
                  {formMode === 'create' ? 'NEW SERVICE' : 'SERVICE CONFIGURATION'}
                </p>
                <h2 id="service-form-title">
                  {formMode === 'create' ? 'Add a service' : 'Edit service'}
                </h2>
                <p id="service-form-description">
                  {formMode === 'create'
                    ? 'Set the URL and schedule WakePulse should monitor.'
                    : 'Update the configuration WakePulse uses to monitor this service.'}
                </p>
              </div>
              <button
                className="services-dialog-close"
                type="button"
                aria-label={`Close ${formMode === 'create' ? 'add' : 'edit'} service form`}
                onClick={closeServiceDialog}
                disabled={isSubmitting}
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>

            {formError && (
              <div className="services-form-error" role="alert">
                <span aria-hidden="true">!</span>
                <p>{formError}</p>
              </div>
            )}

            <form
              className="services-form"
              onSubmit={(event) => void handleServiceFormSubmit(event)}
              noValidate
              aria-busy={isSubmitting}
            >
              <p className="services-required-note">
                <span aria-hidden="true">*</span> Required fields
              </p>

              <div className="services-form-grid">
                <div className="services-form-field">
                  <label htmlFor="service-name">
                    Service name <span aria-hidden="true">*</span>
                  </label>
                  <input
                    ref={serviceNameInputRef}
                    id="service-name"
                    name="name"
                    type="text"
                    value={formValues.name}
                    onChange={(event) => updateFormField('name', event.currentTarget.value)}
                    onBlur={() => validateField('name')}
                    autoComplete="off"
                    maxLength={100}
                    required
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-describedby={`service-name-hint${fieldErrors.name ? ' service-name-error' : ''}`}
                    placeholder="Production API"
                  />
                  <p className="services-field-hint" id="service-name-hint">
                    Use 2–100 characters.
                  </p>
                  {fieldErrors.name && (
                    <p className="services-field-error" id="service-name-error" aria-live="polite">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div className="services-form-field">
                  <label htmlFor="service-provider">
                    Provider <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="service-provider"
                    name="provider"
                    value={formValues.provider}
                    onChange={(event) =>
                      updateFormField(
                        'provider',
                        event.currentTarget.value as ServiceProvider | '',
                      )
                    }
                    onBlur={() => validateField('provider')}
                    required
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.provider)}
                    aria-describedby={`service-provider-hint${fieldErrors.provider ? ' service-provider-error' : ''}`}
                  >
                    <option value="" disabled>
                      Select a provider
                    </option>
                    {Object.entries(providerLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <p className="services-field-hint" id="service-provider-hint">
                    Choose the platform hosting this service.
                  </p>
                  {fieldErrors.provider && (
                    <p className="services-field-error" id="service-provider-error" aria-live="polite">
                      {fieldErrors.provider}
                    </p>
                  )}
                </div>

                <div className="services-form-field services-form-field--wide">
                  <label htmlFor="service-url">
                    URL <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="service-url"
                    name="url"
                    type="url"
                    value={formValues.url}
                    onChange={(event) => updateFormField('url', event.currentTarget.value)}
                    onBlur={() => validateField('url')}
                    required
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.url)}
                    aria-describedby={`service-url-hint${fieldErrors.url ? ' service-url-error' : ''}`}
                    placeholder="https://api.example.com"
                  />
                  <p className="services-field-hint" id="service-url-hint">
                    Enter the base address using HTTP or HTTPS.
                  </p>
                  {fieldErrors.url && (
                    <p className="services-field-error" id="service-url-error" aria-live="polite">
                      {fieldErrors.url}
                    </p>
                  )}
                </div>

                <div className="services-form-field services-form-field--wide">
                  <label htmlFor="service-endpoint">
                    Endpoint <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="service-endpoint"
                    name="endpoint"
                    type="text"
                    value={formValues.endpoint}
                    onChange={(event) => updateFormField('endpoint', event.currentTarget.value)}
                    onBlur={() => validateField('endpoint')}
                    maxLength={500}
                    required
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.endpoint)}
                    aria-describedby={`service-endpoint-hint${fieldErrors.endpoint ? ' service-endpoint-error' : ''}`}
                    placeholder="/health"
                  />
                  <p className="services-field-hint" id="service-endpoint-hint">
                    Path to check on the service, up to 500 characters.
                  </p>
                  {fieldErrors.endpoint && (
                    <p className="services-field-error" id="service-endpoint-error" aria-live="polite">
                      {fieldErrors.endpoint}
                    </p>
                  )}
                </div>

                <div className="services-form-field">
                  <label htmlFor="service-method">
                    HTTP method <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="service-method"
                    name="method"
                    value={formValues.method}
                    onChange={(event) =>
                      updateFormField('method', event.currentTarget.value as ServiceMethod)
                    }
                    onBlur={() => validateField('method')}
                    required
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.method)}
                    aria-describedby={`service-method-hint${fieldErrors.method ? ' service-method-error' : ''}`}
                  >
                    <option value="GET">GET</option>
                    <option value="HEAD">HEAD</option>
                    <option value="POST">POST</option>
                  </select>
                  <p className="services-field-hint" id="service-method-hint">
                    Defaults to GET.
                  </p>
                  {fieldErrors.method && (
                    <p className="services-field-error" id="service-method-error" aria-live="polite">
                      {fieldErrors.method}
                    </p>
                  )}
                </div>

                <div className="services-form-field">
                  <label htmlFor="service-interval">
                    Check interval (seconds) <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="service-interval"
                    name="intervalSeconds"
                    type="number"
                    value={formValues.intervalSeconds}
                    onChange={(event) =>
                      updateFormField('intervalSeconds', event.currentTarget.value)
                    }
                    onBlur={() => validateField('intervalSeconds')}
                    min={30}
                    max={86400}
                    step={1}
                    required
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.intervalSeconds)}
                    aria-describedby={`service-interval-hint${fieldErrors.intervalSeconds ? ' service-interval-error' : ''}`}
                  />
                  <p className="services-field-hint" id="service-interval-hint">
                    30 seconds to 86,400 seconds. Default: 300.
                  </p>
                  {fieldErrors.intervalSeconds && (
                    <p className="services-field-error" id="service-interval-error" aria-live="polite">
                      {fieldErrors.intervalSeconds}
                    </p>
                  )}
                </div>

                <div className="services-form-field">
                  <label htmlFor="service-timeout">
                    Timeout (seconds) <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="service-timeout"
                    name="timeoutSeconds"
                    type="number"
                    value={formValues.timeoutSeconds}
                    onChange={(event) =>
                      updateFormField('timeoutSeconds', event.currentTarget.value)
                    }
                    onBlur={() => validateField('timeoutSeconds')}
                    min={5}
                    max={60}
                    step={1}
                    required
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.timeoutSeconds)}
                    aria-describedby={`service-timeout-hint${fieldErrors.timeoutSeconds ? ' service-timeout-error' : ''}`}
                  />
                  <p className="services-field-hint" id="service-timeout-hint">
                    5–60 seconds. Default: 15.
                  </p>
                  {fieldErrors.timeoutSeconds && (
                    <p className="services-field-error" id="service-timeout-error" aria-live="polite">
                      {fieldErrors.timeoutSeconds}
                    </p>
                  )}
                </div>
              </div>

              <div className="services-form-actions">
                <button
                  className="services-cancel-button"
                  type="button"
                  onClick={closeServiceDialog}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  className="services-submit-button"
                  type="submit"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting
                    ? formMode === 'create'
                      ? 'Creating…'
                      : 'Saving…'
                    : formMode === 'create'
                      ? 'Create Service'
                      : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {deleteTarget && (
        <dialog
          ref={deleteDialogRef}
          className="services-dialog services-delete-dialog"
          aria-labelledby="delete-service-title"
          aria-describedby="delete-service-description delete-service-warning"
          aria-busy={isDeletingService}
          onClose={handleDeleteDialogClose}
          onCancel={(event) => {
            if (deleteSubmissionLock.current) {
              event.preventDefault()
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              if (!deleteSubmissionLock.current) {
                closeDeleteDialog()
              }
            }
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteDialog()
            }
          }}
        >
          <div className="services-dialog-content">
            <header className="services-dialog-heading">
              <div>
                <p className="eyebrow">REMOVE SERVICE</p>
                <h2 id="delete-service-title">Delete service?</h2>
                <p id="delete-service-description">
                  Confirm that you want to remove this monitored service.
                </p>
              </div>
              <button
                className="services-dialog-close"
                type="button"
                aria-label="Close delete service confirmation"
                onClick={closeDeleteDialog}
                disabled={isDeletingService}
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <div className="services-delete-target">
              <strong>{deleteTarget.name}</strong>
              <span>
                {providerLabels[deleteTarget.provider]} ·{' '}
                {getServiceDomain(deleteTarget.url)}
              </span>
            </div>

            <p className="services-delete-warning" id="delete-service-warning">
              This permanently removes the service from WakePulse and stops its
              scheduled monitoring. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="services-form-error" role="alert">
                <span aria-hidden="true">!</span>
                <p>{deleteError}</p>
              </div>
            )}

            <div className="services-form-actions">
              <button
                ref={deleteCancelButtonRef}
                className="services-cancel-button"
                type="button"
                onClick={closeDeleteDialog}
                disabled={isDeletingService}
              >
                Cancel
              </button>
              <button
                className="services-delete-confirm-button"
                type="button"
                onClick={() => void handleDeleteService()}
                disabled={
                  isDeletingService ||
                  (deleteTarget !== null &&
                    serviceActionStates[deleteTarget.id]?.status === 'updating')
                }
                aria-busy={isDeletingService}
              >
                {isDeletingService
                  ? 'Deleting…'
                  : deleteTarget !== null &&
                      serviceActionStates[deleteTarget.id]?.status === 'updating'
                    ? 'Updating…'
                    : 'Delete Service'}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </AppLayout>
  )
}
