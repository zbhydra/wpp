## 简介
1. 动态发现
2. 流程化
3. 规范化
4. 可以使用脚本等工具
5. 可手动触发

## 示例
```md
---
name: convert-to-word
description: 把PDF转换成为Word
---

# Convert PDF to Word

This skill converts PDF documents to editable Word (.docx) format.

## Usage

When the user requests to convert a PDF to Word format:

1. Install required dependencies if not already installed:
bash
pip install pdf2docx python-docx PyPDF2


2. Use the following Python code to perform the conversion:

python
from pdf2docx import Converter
from pathlib import Path

def convert_pdf_to_word(pdf_path, output_path=None):
    """Convert a PDF file to Word (.docx) format."""
    pdf_file = Path(pdf_path)
    
    if not pdf_file.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    if output_path is None:
        output_path = pdf_file.with_suffix('.docx')
    else:
        output_path = Path(output_path)
    
    print(f"Converting {pdf_file.name}...")
    
    converter = Converter(str(pdf_file))
    converter.convert(str(output_path))
    converter.close()
    
    if output_path.exists():
        file_size = output_path.stat().st_size / 1024
        print(f"✓ Conversion successful!")
        print(f"  Output: {output_path}")
        print(f"  Size: {file_size:.2f} KB")
        return str(output_path)
    else:
        raise RuntimeError("Conversion failed")

# Example usage:
# convert_pdf_to_word("document.pdf")
# convert_pdf_to_word("report.pdf", "output/report.docx")


## Features

- Preserves text formatting
- Retains images and graphics
- Maintains table structures
- Supports multi-page documents
- Simple error handling

## Limitations

- Complex layouts may not convert perfectly
- Scanned PDFs require OCR preprocessing
- Password-protected PDFs need to be unlocked first
```