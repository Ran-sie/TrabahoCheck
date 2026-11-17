import { bullets, contact, filled, jobs, range, resumeFileName, schools, type Template } from './resume'
import type { Strings } from './strings'
import type { ProfileFields } from './types'

const ACCENT = '#1e4fa8'
const INK = '#111827'
const BODY = '#374151'
const MUTED = '#6b7280'
const RULE = '#d1d5db'
const SLATE = '#1e293b'
const SIDE = '#f1f5f9'

/**
 * Draws the resume as a real PDF (selectable text, so job sites that scan
 * resumes can read it). The PDF library is loaded only when this first runs.
 * The same file is used for the on-page preview and the download, so they
 * always match.
 */
export async function buildResumePdf(data: ProfileFields, template: Template, t: Strings): Promise<Blob> {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import('@react-pdf/renderer')

  const s = t.tplSections
  const work = jobs(data)
  const study = schools(data)
  const reach = contact(data)
  const ats = template === 'ats'

  const serif = ats
  const reg = serif ? 'Times-Roman' : 'Helvetica'
  const bold = serif ? 'Times-Bold' : 'Helvetica-Bold'
  const ital = serif ? 'Times-Italic' : 'Helvetica-Oblique'

  const st = StyleSheet.create({
    page: { fontFamily: reg, fontSize: serif ? 10.5 : 9.5, color: BODY, lineHeight: 1.4 },
    bold: { fontFamily: bold, color: INK },
    ital: { fontFamily: ital },
    muted: { color: MUTED },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    grow: { flex: 1, paddingRight: 8 },
    date: { flexShrink: 0, color: MUTED, fontSize: serif ? 10 : 8.5 },
    bulletRow: { flexDirection: 'row', marginTop: 1.5 },
    bulletMark: { width: 10 },
    bulletText: { flex: 1 },
  })

  const bulletList = (text: string | null) =>
    bullets(text).map((line, i) => (
      <View key={i} style={st.bulletRow}>
        <Text style={st.bulletMark}>•</Text>
        <Text style={st.bulletText}>{line}</Text>
      </View>
    ))

  // ---------- ATS Classic: one column, serif, black and white ----------
  if (template === 'ats') {
    const heading = (title: string) => (
      <View style={{ borderBottomWidth: 0.8, borderBottomColor: INK, marginTop: 12, marginBottom: 5, paddingBottom: 1.5 }}>
        <Text style={{ fontFamily: bold, fontSize: 11, letterSpacing: 0.8, color: INK }}>{title.toUpperCase()}</Text>
      </View>
    )

    const doc = (
      <Document title={`${data.name} Resume`} author={data.name}>
        <Page size="A4" style={[st.page, { paddingVertical: 40, paddingHorizontal: 48 }]}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: bold, fontSize: 20, letterSpacing: 1, color: INK, lineHeight: 1.2 }}>
              {data.name.toUpperCase()}
            </Text>
            {filled(data.headline) && <Text style={{ fontSize: 11, marginTop: 3 }}>{data.headline}</Text>}
            {reach.length > 0 && <Text style={{ fontSize: 9.5, marginTop: 4, color: BODY }}>{reach.join('  •  ')}</Text>}
          </View>

          {filled(data.summary) && (
            <View>
              {heading(s.summary)}
              <Text>{data.summary}</Text>
            </View>
          )}

          {work.length > 0 && (
            <View>
              {heading(s.experience)}
              {work.map((j, i) => (
                <View key={i} wrap={false} style={{ marginBottom: 7 }}>
                  <View style={st.row}>
                    <Text style={[st.bold, st.grow]}>{j.title}</Text>
                    <Text style={st.date}>{range(j.start, j.end, s.present)}</Text>
                  </View>
                  {filled(j.company) && <Text style={st.ital}>{j.company}</Text>}
                  {bulletList(j.description)}
                </View>
              ))}
            </View>
          )}

          {study.length > 0 && (
            <View>
              {heading(s.education)}
              {study.map((e, i) => (
                <View key={i} wrap={false} style={{ marginBottom: 5 }}>
                  <View style={st.row}>
                    <Text style={[st.bold, st.grow]}>{e.school}</Text>
                    <Text style={st.date}>{range(e.start, e.end, s.present)}</Text>
                  </View>
                  {filled(e.degree) && <Text style={st.ital}>{e.degree}</Text>}
                </View>
              ))}
            </View>
          )}

          {(data.skills.length > 0 || data.certifications.length > 0 || data.languages.length > 0) && (
            <View>
              {heading(s.additional)}
              {(
                [
                  [s.skills, data.skills],
                  [s.certifications, data.certifications],
                  [s.languages, data.languages],
                ] as const
              ).map(
                ([label, items]) =>
                  items.length > 0 && (
                    <Text key={label} style={{ marginBottom: 2 }}>
                      <Text style={st.bold}>{label}: </Text>
                      {items.join(', ')}
                    </Text>
                  ),
              )}
            </View>
          )}
        </Page>
      </Document>
    )
    return pdf(doc).toBlob()
  }

  // ---------- Modern Minimal: one column, date column, blue accent ----------
  if (template === 'minimal') {
    const heading = (title: string) => (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 7 }}>
        <Text style={{ fontFamily: bold, fontSize: 8.5, letterSpacing: 1.6, color: ACCENT }}>{title.toUpperCase()}</Text>
        <View style={{ flex: 1, height: 0.75, backgroundColor: RULE, marginLeft: 8 }} />
      </View>
    )

    const timeline = (when: string, children: React.ReactNode, key: number) => (
      <View key={key} wrap={false} style={{ flexDirection: 'row', marginBottom: 9 }}>
        <Text style={{ width: 92, flexShrink: 0, fontSize: 8.5, color: MUTED, paddingTop: 1 }}>{when}</Text>
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    )

    const pills = (items: string[]) => (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {items.map((i) => (
          <Text
            key={i}
            style={{ backgroundColor: '#eef2fb', color: ACCENT, fontSize: 8.5, paddingVertical: 2.5, paddingHorizontal: 7, borderRadius: 8, marginRight: 4, marginBottom: 4 }}
          >
            {i}
          </Text>
        ))}
      </View>
    )

    const doc = (
      <Document title={`${data.name} Resume`} author={data.name}>
        <Page size="A4" style={[st.page, { paddingVertical: 42, paddingHorizontal: 46 }]}>
          <View style={{ borderLeftWidth: 3, borderLeftColor: ACCENT, paddingLeft: 12 }}>
            <Text style={{ fontFamily: bold, fontSize: 25, color: INK, lineHeight: 1.15 }}>{data.name}</Text>
            {filled(data.headline) && <Text style={{ fontSize: 11.5, color: ACCENT, marginTop: 3 }}>{data.headline}</Text>}
            {reach.length > 0 && <Text style={{ fontSize: 8.5, color: MUTED, marginTop: 5 }}>{reach.join('   ·   ')}</Text>}
          </View>

          {filled(data.summary) && (
            <View>
              {heading(s.summary)}
              <Text>{data.summary}</Text>
            </View>
          )}

          {work.length > 0 && (
            <View>
              {heading(s.experience)}
              {work.map((j, i) =>
                timeline(
                  range(j.start, j.end, s.present),
                  <>
                    <Text style={[st.bold, { fontSize: 10 }]}>{j.title}</Text>
                    {filled(j.company) && <Text style={st.muted}>{j.company}</Text>}
                    {bulletList(j.description)}
                  </>,
                  i,
                ),
              )}
            </View>
          )}

          {study.length > 0 && (
            <View>
              {heading(s.education)}
              {study.map((e, i) =>
                timeline(
                  range(e.start, e.end, s.present),
                  <>
                    <Text style={[st.bold, { fontSize: 10 }]}>{e.degree || e.school}</Text>
                    {filled(e.degree) && <Text style={st.muted}>{e.school}</Text>}
                  </>,
                  i,
                ),
              )}
            </View>
          )}

          {data.skills.length > 0 && (
            <View>
              {heading(s.skills)}
              {pills(data.skills)}
            </View>
          )}

          {(data.certifications.length > 0 || data.languages.length > 0) && (
            <View style={{ flexDirection: 'row' }}>
              {data.certifications.length > 0 && (
                <View style={{ flex: 1, paddingRight: 12 }}>
                  {heading(s.certifications)}
                  {data.certifications.map((c) => (
                    <Text key={c}>{c}</Text>
                  ))}
                </View>
              )}
              {data.languages.length > 0 && (
                <View style={{ flex: 1 }}>
                  {heading(s.languages)}
                  <Text>{data.languages.join(', ')}</Text>
                </View>
              )}
            </View>
          )}
        </Page>
      </Document>
    )
    return pdf(doc).toBlob()
  }

  // ---------- Professional: dark header band and a light sidebar ----------
  const sideHeading = (title: string) => (
    <Text style={{ fontFamily: bold, fontSize: 8.5, letterSpacing: 1.4, color: ACCENT, marginTop: 16, marginBottom: 5 }}>
      {title.toUpperCase()}
    </Text>
  )
  const mainHeading = (title: string) => (
    <View style={{ borderBottomWidth: 1.2, borderBottomColor: ACCENT, marginTop: 16, marginBottom: 7, paddingBottom: 2 }}>
      <Text style={{ fontFamily: bold, fontSize: 9.5, letterSpacing: 1.4, color: INK }}>{title.toUpperCase()}</Text>
    </View>
  )

  const doc = (
    <Document title={`${data.name} Resume`} author={data.name}>
      <Page size="A4" style={st.page}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '32%', backgroundColor: SIDE }} fixed />

        <View style={{ backgroundColor: SLATE, paddingVertical: 26, paddingHorizontal: 30 }}>
          <Text style={{ fontFamily: bold, fontSize: 24, color: '#ffffff', lineHeight: 1.15 }}>{data.name}</Text>
          {filled(data.headline) && <Text style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>{data.headline}</Text>}
        </View>

        <View style={{ flexDirection: 'row', flexGrow: 1 }}>
          <View style={{ width: '32%', paddingHorizontal: 20, paddingBottom: 24 }}>
            {reach.length > 0 && (
              <View>
                {sideHeading(s.contact)}
                {reach.map((c) => (
                  <Text key={c} style={{ fontSize: 8.5, marginBottom: 3 }}>
                    {c}
                  </Text>
                ))}
              </View>
            )}
            {data.skills.length > 0 && (
              <View>
                {sideHeading(s.skills)}
                {data.skills.map((k) => (
                  <Text key={k} style={{ fontSize: 9, marginBottom: 2 }}>
                    {k}
                  </Text>
                ))}
              </View>
            )}
            {study.length > 0 && (
              <View>
                {sideHeading(s.education)}
                {study.map((e, i) => (
                  <View key={i} wrap={false} style={{ marginBottom: 6 }}>
                    <Text style={[st.bold, { fontSize: 9 }]}>{e.degree || e.school}</Text>
                    {filled(e.degree) && <Text style={{ fontSize: 8.5 }}>{e.school}</Text>}
                    <Text style={{ fontSize: 8, color: MUTED }}>{range(e.start, e.end, s.present)}</Text>
                  </View>
                ))}
              </View>
            )}
            {data.certifications.length > 0 && (
              <View>
                {sideHeading(s.certifications)}
                {data.certifications.map((c) => (
                  <Text key={c} style={{ fontSize: 8.5, marginBottom: 2 }}>
                    {c}
                  </Text>
                ))}
              </View>
            )}
            {data.languages.length > 0 && (
              <View>
                {sideHeading(s.languages)}
                <Text style={{ fontSize: 8.5 }}>{data.languages.join(', ')}</Text>
              </View>
            )}
          </View>

          <View style={{ width: '68%', paddingHorizontal: 26, paddingBottom: 24 }}>
            {filled(data.summary) && (
              <View>
                {mainHeading(s.summary)}
                <Text>{data.summary}</Text>
              </View>
            )}
            {work.length > 0 && (
              <View>
                {mainHeading(s.experience)}
                {work.map((j, i) => (
                  <View key={i} wrap={false} style={{ marginBottom: 9 }}>
                    <View style={st.row}>
                      <Text style={[st.bold, st.grow, { fontSize: 10 }]}>{j.title}</Text>
                      <Text style={st.date}>{range(j.start, j.end, s.present)}</Text>
                    </View>
                    {filled(j.company) && <Text style={{ color: ACCENT }}>{j.company}</Text>}
                    {bulletList(j.description)}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  )
  return pdf(doc).toBlob()
}

export async function downloadResumePdf(data: ProfileFields, template: Template, t: Strings): Promise<void> {
  saveBlob(await buildResumePdf(data, template, t), resumeFileName(data.name))
}

export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
