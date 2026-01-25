import { NextResponse } from "next/server";
import { CVData } from "@/lib/types/cv";

// Generate a professional HTML resume that can be printed to PDF
function generatePrintableHTML(cvData: CVData, title?: string): string {
  const { basics, summary, experience, education, skills, projects, certifications, languages } = cvData;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${basics.name} - Resume</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { margin: 0.5in; size: letter; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #1a1a1a;
      padding: 0.5in;
      max-width: 8.5in;
      margin: 0 auto;
    }
    h1 { font-size: 22pt; font-weight: bold; color: #0a0a0a; margin-bottom: 4px; }
    h2 { font-size: 11pt; font-weight: normal; color: #444; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #333; padding-bottom: 4px; margin: 16px 0 10px; }
    h3 { font-size: 11pt; font-weight: bold; margin-bottom: 2px; }
    .header { text-align: center; margin-bottom: 16px; }
    .title { font-size: 12pt; color: #444; margin-bottom: 8px; }
    .contact { font-size: 10pt; color: #555; }
    .contact a { color: #0066cc; text-decoration: none; }
    .contact span { margin: 0 6px; }
    ${basics.photoUrl ? `.photo { width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 10px; display: block; object-fit: cover; }` : ''}
    .section { margin-bottom: 12px; }
    .entry { margin-bottom: 10px; }
    .entry-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
    .entry-title { font-weight: bold; }
    .entry-subtitle { color: #444; font-style: italic; }
    .entry-date { font-size: 10pt; color: #666; }
    .entry-description { margin-top: 4px; }
    ul { margin-left: 18px; margin-top: 4px; }
    li { margin-bottom: 2px; }
    .skills-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-category { margin-bottom: 6px; }
    .skill-category strong { font-size: 10pt; }
    .skill-items { display: inline; }
    .summary { text-align: justify; color: #333; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <header class="header">
    ${basics.photoUrl ? `<img src="${basics.photoUrl}" alt="${basics.name}" class="photo">` : ''}
    <h1>${basics.name || 'Your Name'}</h1>
    ${basics.title ? `<div class="title">${basics.title}</div>` : ''}
    <div class="contact">
      ${[
        basics.contact.email ? `<a href="mailto:${basics.contact.email}">${basics.contact.email}</a>` : '',
        basics.contact.phone,
        basics.contact.location,
        basics.contact.linkedin ? `<a href="https://${basics.contact.linkedin.replace(/^https?:\/\//, '')}">${basics.contact.linkedin.replace(/^https?:\/\//, '')}</a>` : '',
        basics.contact.github ? `<a href="https://${basics.contact.github.replace(/^https?:\/\//, '')}">${basics.contact.github.replace(/^https?:\/\//, '')}</a>` : '',
        basics.contact.website ? `<a href="https://${basics.contact.website.replace(/^https?:\/\//, '')}">${basics.contact.website.replace(/^https?:\/\//, '')}</a>` : '',
      ].filter(Boolean).join('<span>|</span>')}
    </div>
  </header>

  ${summary ? `
  <section class="section">
    <h2>Professional Summary</h2>
    <p class="summary">${summary}</p>
  </section>
  ` : ''}

  ${experience?.length ? `
  <section class="section">
    <h2>Experience</h2>
    ${experience.map(exp => `
    <div class="entry">
      <div class="entry-header">
        <div>
          <span class="entry-title">${exp.role}</span>
          ${exp.company ? `<span class="entry-subtitle"> at ${exp.company}</span>` : ''}
          ${exp.location ? `<span style="color: #666; font-size: 10pt;"> - ${exp.location}</span>` : ''}
        </div>
        <span class="entry-date">${exp.startDate}${exp.endDate ? ` - ${exp.endDate}` : exp.current ? ' - Present' : ''}</span>
      </div>
      ${(exp.bullets || []).length ? `
      <ul>
        ${(exp.bullets || []).map((h: string) => `<li>${h}</li>`).join('')}
      </ul>
      ` : ''}
    </div>
    `).join('')}
  </section>
  ` : ''}

  ${education?.length ? `
  <section class="section">
    <h2>Education</h2>
    ${education.map(edu => `
    <div class="entry">
      <div class="entry-header">
        <div>
          <span class="entry-title">${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</span>
          ${edu.institution ? `<span class="entry-subtitle"> - ${edu.institution}</span>` : ''}
        </div>
        <span class="entry-date">${edu.startDate || ''}${edu.endDate ? ` - ${edu.endDate}` : ''}</span>
      </div>
      ${edu.gpa ? `<p style="font-size: 10pt; color: #555;">GPA: ${edu.gpa}</p>` : ''}
      ${(edu.highlights || []).length ? `
      <ul>
        ${(edu.highlights || []).map((a: string) => `<li>${a}</li>`).join('')}
      </ul>
      ` : ''}
    </div>
    `).join('')}
  </section>
  ` : ''}

  ${skills?.length ? `
  <section class="section">
    <h2>Skills</h2>
    <div>
      ${skills.map(skill => `
      <div class="skill-category">
        <strong>${skill.category || 'Skills'}:</strong>
        <span class="skill-items">${(skill.skills || []).join(', ')}</span>
      </div>
      `).join('')}
    </div>
  </section>
  ` : ''}

  ${projects?.length ? `
  <section class="section">
    <h2>Projects</h2>
    ${projects.map(proj => `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title">${proj.name}</span>
        ${proj.url ? `<a href="${proj.url}" style="font-size: 10pt; color: #0066cc;">View Project</a>` : ''}
      </div>
      ${proj.description ? `<p class="entry-description">${proj.description}</p>` : ''}
      ${(proj.technologies || []).length ? `<p style="font-size: 10pt; color: #555;">Technologies: ${(proj.technologies || []).join(', ')}</p>` : ''}
      ${(proj.bullets || []).length ? `
      <ul>
        ${(proj.bullets || []).map((h: string) => `<li>${h}</li>`).join('')}
      </ul>
      ` : ''}
    </div>
    `).join('')}
  </section>
  ` : ''}

  ${certifications?.length ? `
  <section class="section">
    <h2>Certifications</h2>
    ${certifications.map(cert => `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title">${cert.name}</span>
        <span class="entry-date">${cert.date || ''}</span>
      </div>
      ${cert.issuer ? `<p class="entry-subtitle">${cert.issuer}</p>` : ''}
    </div>
    `).join('')}
  </section>
  ` : ''}

  ${languages?.length ? `
  <section class="section">
    <h2>Languages</h2>
    <p>${languages.map(lang => `${lang.language}${lang.proficiency ? ` (${lang.proficiency})` : ''}`).join(', ')}</p>
  </section>
  ` : ''}
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const { cvData, format, templateId, title } = await request.json();

    if (!cvData) {
      return NextResponse.json({ error: "No CV data provided" }, { status: 400 });
    }

    // For LaTeX format, return the raw LaTeX code
    if (format === "latex") {
      const { generateLatex } = await import("@/lib/latex/generator");
      const latex = generateLatex(cvData, templateId);
      
      return new NextResponse(latex, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="${title || cvData.basics?.name || "cv"}.tex"`,
        },
      });
    }

    // For JSON format, return the CV data
    if (format === "json") {
      return new NextResponse(JSON.stringify(cvData, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${title || cvData.basics?.name || "cv"}.json"`,
        },
      });
    }

    // For PDF (default), return a printable HTML that can be converted to PDF
    const html = generatePrintableHTML(cvData, title);
    
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="${title || cvData.basics?.name || "cv"}.html"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }
}
