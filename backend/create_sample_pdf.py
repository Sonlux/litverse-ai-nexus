from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
import os

def text_to_pdf(text_file, pdf_file):
    """
    Convert a text file to PDF using reportlab
    
    Args:
        text_file: Path to the text file
        pdf_file: Path to save the PDF file
    """
    # Create PDF document
    doc = SimpleDocTemplate(pdf_file, pagesize=letter)
    styles = getSampleStyleSheet()
    
    # Read text file
    with open(text_file, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Process content
    lines = content.split('\n')
    story = []
    
    for line in lines:
        if line.startswith('# '):
            # Main heading
            story.append(Paragraph(line[2:], styles['Title']))
            story.append(Spacer(1, 12))
        elif line.startswith('## '):
            # Subheading
            story.append(Paragraph(line[3:], styles['Heading1']))
            story.append(Spacer(1, 10))
        elif line.startswith('### '):
            # Sub-subheading
            story.append(Paragraph(line[4:], styles['Heading2']))
            story.append(Spacer(1, 8))
        elif line.startswith('- '):
            # Bullet point
            story.append(Paragraph('• ' + line[2:], styles['Normal']))
            story.append(Spacer(1, 6))
        elif line.strip() == '':
            # Empty line
            story.append(Spacer(1, 12))
        else:
            # Regular text
            story.append(Paragraph(line, styles['Normal']))
            story.append(Spacer(1, 6))
    
    # Build PDF
    doc.build(story)
    
    print(f"PDF created: {pdf_file}")

if __name__ == "__main__":
    # File paths
    text_file = "sample.txt"
    pdf_file = "data/uploads/sample.pdf"
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(pdf_file), exist_ok=True)
    
    # Convert text to PDF
    text_to_pdf(text_file, pdf_file) 