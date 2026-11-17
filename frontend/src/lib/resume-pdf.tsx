import { contact, filled, jobLine, range, resumeFileName, schoolLine, type Template } from './resume'
import type { Strings } from './strings'
import type { ProfileFields } from './types'

const BLUE = '#1e4fa8'
const INK = '#171717'
const MUTED = '#525252'

/**
 * Builds the resume as a real PDF (selectable text, so job sites that scan
 * resumes can read it) and saves it. The PDF library is loaded only when this
 * runs, so it adds nothing to the normal page load.
 */
export async function downloadResumePdf(data: ProfileFields, template: Template, t: Strings): Promise<void> {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import('@react-pdf/renderer')

  const s = t.tplSections
  const jobs = data.experience.filter((j) => filled(j.title))
  const schools = data.education.filter((e) => filled(e.school))
  const modern = template === 'modern'
  const compact = template === 'compact'

  const base = compact ? 9 : 10
  const font = template === 'classic' ? 'Times-Roman' : 'Helvetica'
  const bold = template === 'classic' ? 'Times-Bold' : 'Helvetica-Bold'

  const st = StyleSheet.create({
    page: { fontFamily: font, fontSize: base, color: INK, lineHeight: 1.35, padding: compact ? 28 : 36 },
    modernPage: { fontFamily: font, fontSize: base, color: INK, lineHeight: 1.35, flexDirection: 'row' },
    sideBg: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '34%', backgroundColor: BLUE },
    side: { width: '34%', padding: 22, color: '#ffffff', gap: 14 },
    main: { width: '66%', padding: 26, gap: 14 },
    sideTitle: { fontFamily: bold, fontSize: 8, letterSpacing: 1.2, color: '#c7d6f0', marginBottom: 4 },
    name: { fontFamily: bold, fontSize: modern ? 24 : compact ? 20 : 24, color: modern ? BLUE : INK },
    headline: { fontSize: base + 2, color: MUTED, marginTop: 2 },
    center: { alignItems: 'center', textAlign: 'center', gap: 2, marginBottom: 10 },
    left: { gap: 2, marginBottom: 6 },
    contactLine: { fontSize: base - 0.5, color: MUTED, marginTop: 2 },
    section: { gap: compact ? 3 : 5, marginTop: compact ? 6 : 10 },
    heading: {
      fontFamily: bold,
      fontSize: compact ? 8 : 9,
      letterSpacing: 1.2,
      borderBottomWidth: modern ? 1.5 : 0.75,
      borderBottomColor: modern ? BLUE : INK,
      paddingBottom: 2,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    bold: { fontFamily: bold },
    date: { fontSize: base - 1, color: MUTED },
    desc: { color: '#404040', marginTop: 1 },
    gap: { gap: compact ? 5 : 8 },
  })

  const dated = (title: string, from: string | null, to: string | null, body?: string | null) => (
    <View wrap={false} key={`${title}-${from}-${to}`}>
      <View style={st.row}>
        <Text style={[st.bold, { flexShrink: 1 }]}>{title}</Text>
        <Text style={st.date}>{range(from, to, s.present)}</Text>
      </View>
      {filled(body) && <Text style={st.desc}>{body}</Text>}
    </View>
  )

  const jobRows = jobs.map((j) => dated(jobLine(j), j.start, j.end, j.description))
  const schoolRows = schools.map((e) => dated(schoolLine(e), e.start, e.end))

  const section = (title: string, children: React.ReactNode) => (
    <View style={st.section}>
      <Text style={st.heading}>{title.toUpperCase()}</Text>
      {children}
    </View>
  )

  const sideList = (title: string, items: string[]) =>
    items.length > 0 && (
      <View>
        <Text style={st.sideTitle}>{title.toUpperCase()}</Text>
        {items.map((i) => (
          <Text key={i} style={{ marginBottom: 2 }}>
            {i}
          </Text>
        ))}
      </View>
    )

  const doc = (
    <Document title={`${data.name} Resume`} author={data.name}>
      {modern ? (
        <Page size="A4" style={st.modernPage}>
          <View style={st.sideBg} fixed />
          <View style={st.side}>
            <View>
              <Text style={st.sideTitle}>CONTACT</Text>
              {contact(data).map((c) => (
                <Text key={c} style={{ marginBottom: 2 }}>
                  {c}
                </Text>
              ))}
            </View>
            {sideList(s.skills, data.skills)}
            {sideList(s.languages, data.languages)}
            {sideList(s.certifications, data.certifications)}
          </View>
          <View style={st.main}>
            <View>
              <Text style={st.name}>{data.name}</Text>
              {filled(data.headline) && <Text style={st.headline}>{data.headline}</Text>}
            </View>
            {filled(data.summary) && section(s.summary, <Text>{data.summary}</Text>)}
            {jobRows.length > 0 && section(s.experience, <View style={st.gap}>{jobRows}</View>)}
            {schoolRows.length > 0 && section(s.education, <View style={st.gap}>{schoolRows}</View>)}
          </View>
        </Page>
      ) : (
        <Page size="A4" style={st.page}>
          <View style={compact ? st.left : st.center}>
            <Text style={st.name}>{data.name}</Text>
            {filled(data.headline) && <Text style={st.headline}>{data.headline}</Text>}
            <Text style={st.contactLine}>{contact(data).join('   |   ')}</Text>
          </View>
          {filled(data.summary) && section(s.summary, <Text>{data.summary}</Text>)}
          {data.skills.length > 0 && section(s.skills, <Text>{data.skills.join(' · ')}</Text>)}
          {jobRows.length > 0 && section(s.experience, <View style={st.gap}>{jobRows}</View>)}
          {schoolRows.length > 0 && section(s.education, <View style={st.gap}>{schoolRows}</View>)}
          {data.certifications.length > 0 && section(s.certifications, <Text>{data.certifications.join(' · ')}</Text>)}
          {data.languages.length > 0 && section(s.languages, <Text>{data.languages.join(' · ')}</Text>)}
        </Page>
      )}
    </Document>
  )

  const blob = await pdf(doc).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = resumeFileName(data.name)
  link.click()
  URL.revokeObjectURL(url)
}
