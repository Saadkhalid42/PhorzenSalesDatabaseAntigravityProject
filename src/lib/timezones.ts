export const getTimezoneFromPhone = (phone: string | null | undefined): string | null => {
  if (!phone) return null
  
  // Strip everything except digits
  const digits = String(phone).replace(/\D/g, '')
  if (digits.length < 10) return null
  
  // Always take last 10 digits — handles +1, 1, country codes, extensions
  const last10 = digits.slice(-10)
  
  // Validate it looks like a real NANP number (area code can't start with 0 or 1)
  if (last10[0] === '0' || last10[0] === '1') return null
  
  const areaCode = last10.substring(0, 3)

  const PST = new Set(['206','208','209','213','236','250','253','310','323','360','408','415','424','425','442','503','509','510','530','541','559','562','604','619','626','650','657','661','702','714','725','747','760','778','805','818','831','858','909','916','925','949','951'])
  const MST = new Set(['303','307','385','406','435','480','505','520','575','602','623','719','720','801','928','970'])
  const CST = new Set(['205','210','214','217','218','224','225','228','251','254','256','262','270','281','308','309','312','314','316','318','319','325','334','337','361','402','405','409','414','417','430','432','469','479','501','504','507','512','515','534','539','563','573','580','601','605','608','612','615','618','620','630','636','641','651','660','662','682','701','708','712','713','715','731','763','769','773','815','816','817','830','832','847','870','901','903','913','915','918','920','931','936','940','952','956','972','979'])
  const EST = new Set(['201','202','203','207','212','215','216','226','234','239','240','248','252','267','301','302','304','305','313','315','321','330','347','351','386','401','404','407','410','412','416','419','434','440','443','470','475','478','484','502','508','513','516','518','519','540','561','570','571','585','603','607','609','610','613','614','617','631','646','678','703','704','716','717','718','724','732','740','754','757','770','774','781','786','804','813','814','828','843','845','850','856','859','860','862','864','904','908','910','914','917','919','937','954','973','980','989'])

  if (PST.has(areaCode)) return 'America/Los_Angeles'
  if (MST.has(areaCode)) return 'America/Denver'
  if (CST.has(areaCode)) return 'America/Chicago'
  if (EST.has(areaCode)) return 'America/New_York'

  // Not found — return null (will show '--')
  return null
}

export const formatPhoneTime = (phone: string | null | undefined): string | null => {
  const tz = getTimezoneFromPhone(phone)
  if (!tz) return null

  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZoneName: 'short'
    }).format(new Date())
  } catch {
    return null
  }
}
