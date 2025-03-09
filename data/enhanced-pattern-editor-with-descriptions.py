import json
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import os, re
import subprocess
import tempfile
import sys

class SimpleJSEditor(scrolledtext.ScrolledText):
    """A simple JavaScript editor with basic syntax highlighting"""
    
    def __init__(self, master=None, **kwargs):
        # Set default font for code
        if 'font' not in kwargs:
            kwargs['font'] = ('Consolas', 10)
        
        # Initialize ScrolledText widget
        super().__init__(master, **kwargs)
        
        # Create tags for syntax highlighting
        self.create_tags()
        
        # Bind events for syntax highlighting
        self.bind('<KeyRelease>', self.highlight_text)
        self.bind('<FocusIn>', self.highlight_text)
        
    def create_tags(self):
        # Define colors for different syntax elements
        self.tag_configure('keyword', foreground='#0000FF')  # Blue
        self.tag_configure('string', foreground='#008000')   # Green
        self.tag_configure('comment', foreground='#808080')  # Gray
        self.tag_configure('function', foreground='#800080') # Purple
        self.tag_configure('number', foreground='#FF8000')   # Orange
        self.tag_configure('operator', foreground='#B22222') # Firebrick
        
    def highlight_text(self, event=None):
        # Delete all existing tags
        for tag in ['keyword', 'string', 'comment', 'function', 'number', 'operator']:
            self.tag_remove(tag, '1.0', 'end')
        
        # Get all text
        text_content = self.get('1.0', 'end')
        
        # Highlight keywords
        keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else',
                   'for', 'while', 'do', 'switch', 'case', 'default', 'break',
                   'continue', 'try', 'catch', 'finally', 'throw', 'new', 'delete',
                   'typeof', 'instanceof', 'void', 'this', 'null', 'undefined',
                   'true', 'false', 'in', 'of', 'export', 'import', 'from', 'as',
                   'class', 'extends', 'super', 'get', 'set', 'static', 'await', 'async']
        
        for keyword in keywords:
            self.highlight_pattern(r'\b' + keyword + r'\b', 'keyword')
        
        # Highlight strings
        self.highlight_pattern(r'"[^"\\]*(\\.[^"\\]*)*"', 'string')
        self.highlight_pattern(r"'[^'\\]*(\\.[^'\\]*)*'", 'string')
        self.highlight_pattern(r"`[^`\\]*(\\.[^`\\]*)*`", 'string')
        
        # Highlight comments
        self.highlight_pattern(r'//[^\n]*', 'comment')
        # Multiline comments - simplified approach
        comment_start = 0
        while True:
            comment_start = text_content.find('/*', comment_start)
            if comment_start == -1:
                break
            comment_end = text_content.find('*/', comment_start + 2)
            if comment_end == -1:
                # If no end found, highlight to the end
                self.tag_add('comment', f"1.0+{comment_start}c", 'end')
                break
            else:
                # Calculate line and column positions
                start_line = text_content.count('\n', 0, comment_start) + 1
                start_col = comment_start - text_content.rfind('\n', 0, comment_start) - 1
                if start_col < 0:  # If at start of file
                    start_col = comment_start
                
                end_line = text_content.count('\n', 0, comment_end + 2) + 1
                end_col = comment_end + 2 - text_content.rfind('\n', 0, comment_end + 2) - 1
                if end_col < 0:  # Shouldn't happen, but just in case
                    end_col = comment_end + 2
                
                self.tag_add('comment', f"{start_line}.{start_col}", f"{end_line}.{end_col}")
                comment_start = comment_end + 2
        
        # Highlight function declarations/calls
        self.highlight_pattern(r'\b\w+\s*\(', 'function')
        
        # Highlight numbers
        self.highlight_pattern(r'\b\d+\.?\d*\b', 'number')
        
        # Highlight operators
        operators = ['+', '-', '*', '/', '%', '=', '==', '===', '!=', '!==',
                    '>', '<', '>=', '<=', '&&', '||', '!', '&', '|', '^', '~',
                    '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '%=', '&=', '|=',
                    '^=', '<<=', '>>=', '>>>=', '=>', '?', ':']
        
        for op in operators:
            # Escape special regex characters
            escaped_op = re.escape(op)
            self.highlight_pattern(escaped_op, 'operator')
    
    def highlight_pattern(self, pattern, tag):
        # Find and tag all occurrences of the pattern
        for match in re.finditer(pattern, self.get('1.0', 'end-1c'), re.MULTILINE):
            start_index = match.start()
            end_index = match.end()
            
            # Calculate line and column positions
            text_content = self.get('1.0', 'end-1c')
            start_line = text_content.count('\n', 0, start_index) + 1
            start_col = start_index - text_content.rfind('\n', 0, start_index) - 1
            if start_col < 0:  # If at start of file
                start_col = start_index
            
            end_line = text_content.count('\n', 0, end_index) + 1
            end_col = end_index - text_content.rfind('\n', 0, end_index) - 1
            if end_col < 0:  # Shouldn't happen, but just in case
                end_col = end_index
            
            self.tag_add(tag, f"{start_line}.{start_col}", f"{end_line}.{end_col}")



class TransactionPatternEditor:
    def __init__(self, root):
        self.root = root
        self.root.title("Transaction Pattern Editor")
        self.root.geometry("1200x800")
        
        self.patterns = []
        self.current_pattern_index = None
        self.file_path = None
        
        # Create main frames
        self.create_menu()
        self.create_main_layout()
        
        # Configure style
        style = ttk.Style()
        style.configure('TButton', font=('Arial', 10))
        style.configure('TLabel', font=('Arial', 10))
        style.configure('Heading.TLabel', font=('Arial', 12, 'bold'))
        
        # Check if Node.js is installed
        self.node_available = self.check_node_installed()
        if not self.node_available:
            messagebox.showwarning(
                "Node.js Not Found", 
                "Node.js was not found on your system. Pattern testing will be limited. "
                "Install Node.js to enable full testing capabilities."
            )
        
    def check_node_installed(self):
        try:
            subprocess.run(
                ["node", "--version"], 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE, 
                check=True
            )
            return True
        except (subprocess.SubprocessError, FileNotFoundError):
            return False
            
    def create_menu(self):
        menubar = tk.Menu(self.root)
        
        # File menu
        filemenu = tk.Menu(menubar, tearoff=0)
        filemenu.add_command(label="Open", command=self.open_file)
        filemenu.add_command(label="Save", command=self.save_file)
        filemenu.add_command(label="Save As", command=self.save_as_file)
        filemenu.add_separator()
        filemenu.add_command(label="Exit", command=self.root.quit)
        
        menubar.add_cascade(label="File", menu=filemenu)
        
        # Pattern menu
        patternmenu = tk.Menu(menubar, tearoff=0)
        patternmenu.add_command(label="New Pattern", command=self.new_pattern)
        patternmenu.add_command(label="Delete Pattern", command=self.delete_pattern)
        patternmenu.add_command(label="Duplicate Pattern", command=self.duplicate_pattern)
        patternmenu.add_separator()
        patternmenu.add_command(label="Test Pattern", command=self.test_pattern)
        
        menubar.add_cascade(label="Pattern", menu=patternmenu)
        
        # Help menu
        helpmenu = tk.Menu(menubar, tearoff=0)
        helpmenu.add_command(label="About", command=self.show_about)
        
        menubar.add_cascade(label="Help", menu=helpmenu)
        
        self.root.config(menu=menubar)
    
    def create_main_layout(self):
        # Main container with paned window for resizable sections
        main_paned = ttk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        main_paned.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Left panel - Pattern list
        left_frame = ttk.Frame(main_paned)
        
        pattern_frame = ttk.LabelFrame(left_frame, text="Patterns")
        pattern_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Pattern listbox with scrollbar
        listbox_frame = ttk.Frame(pattern_frame)
        listbox_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        self.pattern_listbox = tk.Listbox(listbox_frame, height=25)
        self.pattern_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.pattern_listbox.bind('<<ListboxSelect>>', self.on_pattern_select)
        
        listbox_scrollbar = ttk.Scrollbar(listbox_frame, orient=tk.VERTICAL, command=self.pattern_listbox.yview)
        listbox_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.pattern_listbox.config(yscrollcommand=listbox_scrollbar.set)
        
        # Pattern actions
        button_frame = ttk.Frame(pattern_frame)
        button_frame.pack(fill=tk.X, padx=5, pady=5)
        
        add_btn = ttk.Button(button_frame, text="Add Pattern", command=self.new_pattern)
        add_btn.pack(side=tk.LEFT, padx=5)
        
        delete_btn = ttk.Button(button_frame, text="Delete Pattern", command=self.delete_pattern)
        delete_btn.pack(side=tk.LEFT, padx=5)

        # Add:
        duplicate_btn = ttk.Button(button_frame, text="Duplicate Pattern", command=self.duplicate_pattern)
        duplicate_btn.pack(side=tk.LEFT, padx=5)
        
        # Right panel - Pattern editor
        right_paned = ttk.PanedWindow(main_paned, orient=tk.VERTICAL)
        
        # Add panels to main paned window
        main_paned.add(left_frame, weight=1)
        main_paned.add(right_paned, weight=4)
        
        # Description field
        description_frame = ttk.LabelFrame(right_paned, text="Pattern Description")
        
        self.description_text = ttk.Entry(description_frame)
        self.description_text.pack(fill=tk.X, expand=True, padx=5, pady=5)
        
        # Matcher function editor
        matcher_frame = ttk.LabelFrame(right_paned, text="Matcher Function")
        
        # REPLACE:
        # self.matcher_text = scrolledtext.ScrolledText(matcher_frame, wrap=tk.WORD, width=80, height=15)
        # self.matcher_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        # WITH:
        self.matcher_text = SimpleJSEditor(matcher_frame, wrap=tk.WORD, width=80, height=15)
        self.matcher_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        
        # Generator function editor
        generator_frame = ttk.LabelFrame(right_paned, text="Generator Function")
        
        # REPLACE:
        # self.generator_text = scrolledtext.ScrolledText(generator_frame, wrap=tk.WORD, width=80, height=15)
        # self.generator_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        # WITH:
        self.generator_text = SimpleJSEditor(generator_frame, wrap=tk.WORD, width=80, height=15)
        self.generator_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        
        # Add to paned window
        right_paned.add(description_frame, weight=0)
        right_paned.add(matcher_frame, weight=2)
        right_paned.add(generator_frame, weight=2)
        
        # Status bar and action buttons at the bottom
        bottom_frame = ttk.Frame(self.root)
        bottom_frame.pack(fill=tk.X, padx=10, pady=5)
        
        # Buttons on the right
        action_frame = ttk.Frame(bottom_frame)
        action_frame.pack(side=tk.RIGHT)
        
        test_btn = ttk.Button(action_frame, text="Test Pattern", command=self.test_pattern)
        test_btn.pack(side=tk.LEFT, padx=5)
        
        update_btn = ttk.Button(action_frame, text="Update Pattern", command=self.update_pattern)
        update_btn.pack(side=tk.LEFT, padx=5)
        
        # Status bar on the left
        self.status_label = ttk.Label(bottom_frame, text="No file loaded", anchor=tk.W)
        self.status_label.pack(side=tk.LEFT, fill=tk.X)
    
    def open_file(self):
        file_path = filedialog.askopenfilename(
            title="Open Pattern File",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        
        if not file_path:
            return
            
        try:
            with open(file_path, 'r') as file:
                self.patterns = json.load(file)
            
            # Add description field if not present in patterns
            for pattern in self.patterns:
                if "description" not in pattern:
                    # Try to generate a description from the matcher function
                    matcher_func = pattern.get("matcherFunction", "")
                    auto_desc = self.generate_description_from_matcher(matcher_func)
                    pattern["description"] = auto_desc
            
            self.file_path = file_path
            self.update_pattern_list()
            self.status_label.config(text=f"Loaded: {os.path.basename(file_path)}")
            
            # Select first pattern if available
            if self.patterns:
                self.pattern_listbox.selection_set(0)
                self.on_pattern_select(None)
                
        except json.JSONDecodeError:
            messagebox.showerror("Error", "Invalid JSON file")
        except Exception as e:
            messagebox.showerror("Error", f"Error loading file: {str(e)}")
    
    def generate_description_from_matcher(self, matcher_func):
        """Generate a description from the matcher function content"""
        # Look for comments in the function
        lines = matcher_func.split("\n")
        for line in lines[:5]:  # Check first few lines
            if "//" in line:
                comment = line.split("//")[1].strip()
                if comment and len(comment) > 5:
                    return comment
        
        # Look for distinctive patterns
        if "test(concepto)" in matcher_func:
            for line in matcher_func.split("\n"):
                if "test(concepto)" in line and "//" not in line:
                    pattern = line.split("test(concepto)")[0].strip()
                    if pattern:
                        return f"Concept matching: {pattern}"
        
        # Default description
        return "Transaction pattern"
    
    def save_file(self):
        if not self.file_path:
            self.save_as_file()
            return
            
        try:
            with open(self.file_path, 'w') as file:
                json.dump(self.patterns, file, indent=2)
            
            self.status_label.config(text=f"Saved: {os.path.basename(self.file_path)}")
        except Exception as e:
            messagebox.showerror("Error", f"Error saving file: {str(e)}")
    
    def save_as_file(self):
        file_path = filedialog.asksaveasfilename(
            title="Save Pattern File",
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        
        if not file_path:
            return
            
        self.file_path = file_path
        self.save_file()
    
    def update_pattern_list(self):
        self.pattern_listbox.delete(0, tk.END)
        
        for i, pattern in enumerate(self.patterns):
            # Use the description field if available
            description = pattern.get("description", f"Pattern {i+1}")
            self.pattern_listbox.insert(tk.END, description)
    
    def on_pattern_select(self, event):
        if not self.patterns:
            return
            
        selection = self.pattern_listbox.curselection()
        if not selection:
            return
            
        index = selection[0]
        self.current_pattern_index = index
        pattern = self.patterns[index]
        
        # Update description field
        self.description_text.delete(0, tk.END)
        self.description_text.insert(0, pattern.get("description", ""))
        
        # Update text widgets
        #self.matcher_text.delete(1.0, tk.END)
        #self.matcher_text.insert(tk.END, pattern.get("matcherFunction", ""))
        # When setting text (example from on_pattern_select):
        self.matcher_text.delete("1.0", "end")
        self.matcher_text.insert("1.0", pattern.get("matcherFunction", ""))
        
        #self.generator_text.delete(1.0, tk.END)
        #self.generator_text.insert(tk.END, pattern.get("generatorFunction", ""))
        self.generator_text.delete("1.0", "end")
        self.generator_text.insert("1.0", pattern.get("generatorFunction", ""))
    
    def update_pattern(self):
        if self.current_pattern_index is None:
            messagebox.showinfo("Info", "No pattern selected")
            return
            
        # Get the updated function contents
        description = self.description_text.get().strip()
        #matcher_function = self.matcher_text.get(1.0, tk.END).strip()
        matcher_function = self.matcher_text.get("1.0", "end-1c").strip()
        #generator_function = self.generator_text.get(1.0, tk.END).strip()
        generator_function = self.generator_text.get("1.0", "end-1c").strip()
        
        # Update the pattern
        self.patterns[self.current_pattern_index]["description"] = description
        self.patterns[self.current_pattern_index]["matcherFunction"] = matcher_function
        self.patterns[self.current_pattern_index]["generatorFunction"] = generator_function
        
        # Update the listbox item
        self.update_pattern_list()
        self.pattern_listbox.selection_set(self.current_pattern_index)
        
        self.status_label.config(text="Pattern updated")
    
    # 1. Add a duplicate function to the TransactionPatternEditor class

    def duplicate_pattern(self):
        """Duplicate the currently selected pattern"""
        if self.current_pattern_index is None:
            messagebox.showinfo("Info", "No pattern selected")
            return
            
        # Get the current pattern
        current_pattern = self.patterns[self.current_pattern_index]
        
        # Create a copy with a modified description
        new_pattern = current_pattern.copy()
        new_pattern["description"] = f"Copy of {current_pattern.get('description', 'Unnamed Pattern')}"
        
        # Add the new pattern to the list
        self.patterns.append(new_pattern)
        self.update_pattern_list()
        
        # Select the new pattern
        new_index = len(self.patterns) - 1
        self.pattern_listbox.selection_clear(0, tk.END)
        self.pattern_listbox.selection_set(new_index)
        self.on_pattern_select(None)
        
        self.status_label.config(text="Pattern duplicated")

    def new_pattern(self):
        # Create a new empty pattern
        new_pattern = {
            "description": "New transaction pattern",
            "matcherFunction": """(data) => {
  // Pattern for identifying specific transaction type
  const [caja, fecha, concepto, importe] = data;
  
  // Add your matching conditions here
  const conceptMatches = /your-pattern/i.test(concepto);
  const fechaObj = new Date(fecha);
  const amountInRange = importe > 1000 && importe < 10000;
  
  return conceptMatches && amountInRange; // Return true when conditions match
}""",
            "generatorFunction": """(data) => {
  // Generate output entries for matched transaction
  const [caja, fecha, concepto, importe] = data;
  const cajaReal = caja.split('_')[0];
  const fechaFormateada = formatearFecha(fecha);
  const importeNumerico = parseFloat(importe);
  
  return {
    num_operaciones: 1,
    liquido_operaciones: importeNumerico,
    operaciones: [
      {
        tipo: "ado220",
        detalle: {
          fecha: fechaFormateada,
          expediente: "AUTO-" + fechaFormateada,
          tercero: "GENERIC",
          fpago: "10",
          tpago: "10",
          caja: cajaReal,
          texto: "AUTOMATIC: " + concepto.substring(0, 30),
          aplicaciones: [{
            funcional: "920", 
            economica: "225",
            gfa: null, 
            importe: importeNumerico,
            cuenta: "6310"
          }]
        }
      }
    ]
  };"""
        }
        
        self.patterns.append(new_pattern)
        self.update_pattern_list()
        
        # Select the new pattern
        new_index = len(self.patterns) - 1
        self.pattern_listbox.selection_clear(0, tk.END)
        self.pattern_listbox.selection_set(new_index)
        self.on_pattern_select(None)
        
        self.status_label.config(text="New pattern created")
    
    def delete_pattern(self):
        if self.current_pattern_index is None:
            messagebox.showinfo("Info", "No pattern selected")
            return
            
        if messagebox.askyesno("Confirm", "Delete the selected pattern?"):
            del self.patterns[self.current_pattern_index]
            self.update_pattern_list()
            
            # Reset selection
            self.current_pattern_index = None
            self.description_text.delete(0, tk.END)
            self.matcher_text.delete(1.0, tk.END)
            self.generator_text.delete(1.0, tk.END)
            
            # Select first pattern if available
            if self.patterns:
                self.pattern_listbox.selection_set(0)
                self.on_pattern_select(None)
                
            self.status_label.config(text="Pattern deleted")
    
    def test_pattern(self):
        if self.current_pattern_index is None:
            messagebox.showinfo("Info", "No pattern selected")
            return
            
        # Create test dialog
        test_window = tk.Toplevel(self.root)
        test_window.title("Test Pattern")
        test_window.geometry("800x900")
        test_window.transient(self.root)
        test_window.grab_set()
        
        test_frame = ttk.Frame(test_window, padding="10")
        test_frame.pack(fill=tk.BOTH, expand=True)
        
        # Show pattern description
        pattern = self.patterns[self.current_pattern_index]
        desc_label = ttk.Label(test_frame, text=f"Testing Pattern: {pattern.get('description', 'Unnamed Pattern')}", font=("Arial", 11, "bold"))
        desc_label.pack(anchor="w", pady=(0, 10))
        
        # Input fields
        input_frame = ttk.LabelFrame(test_frame, text="Test Input", padding="5")
        input_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(input_frame, text="Caja:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=2)
        caja_entry = ttk.Entry(input_frame, width=40)
        caja_entry.grid(row=0, column=1, sticky=tk.W+tk.E, padx=5, pady=2)
        caja_entry.insert(0, "BBVA_MAIN")
        
        ttk.Label(input_frame, text="Fecha:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=2)
        fecha_entry = ttk.Entry(input_frame, width=40)
        fecha_entry.grid(row=1, column=1, sticky=tk.W+tk.E, padx=5, pady=2)
        fecha_entry.insert(0, "2024-05-30")
        
        ttk.Label(input_frame, text="Concepto:").grid(row=2, column=0, sticky=tk.W, padx=5, pady=2)
        concepto_entry = ttk.Entry(input_frame, width=40)
        concepto_entry.grid(row=2, column=1, sticky=tk.W+tk.E, padx=5, pady=2)
        concepto_entry.insert(0, "test")
        
        ttk.Label(input_frame, text="Importe:").grid(row=3, column=0, sticky=tk.W, padx=5, pady=2)
        importe_entry = ttk.Entry(input_frame, width=40)
        importe_entry.grid(row=3, column=1, sticky=tk.W+tk.E, padx=5, pady=2)
        importe_entry.insert(0, "55000")
        
        input_frame.columnconfigure(1, weight=1)
        
        # Results area in a notebook to separate results and code
        notebook = ttk.Notebook(test_frame)
        notebook.pack(fill=tk.BOTH, expand=True, padx=5, pady=(10, 5))
        
        # Results tab
        result_frame = ttk.Frame(notebook)
        notebook.add(result_frame, text="Results")
        
        result_text = scrolledtext.ScrolledText(result_frame, wrap=tk.WORD)
        result_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # JavaScript Code tab
        code_frame = ttk.Frame(notebook)
        notebook.add(code_frame, text="JavaScript Code")
        
        
        
       # REPLACE:
        # code_text = scrolledtext.ScrolledText(code_frame, wrap=tk.WORD)
        # code_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        # WITH:
        code_text = SimpleJSEditor(code_frame, wrap=tk.WORD)        
        code_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Bottom frame for buttons
        bottom_frame = ttk.Frame(test_frame)
        bottom_frame.pack(fill=tk.X, pady=10)
        
        # Execute test function
        def execute_test():
            caja = caja_entry.get()
            fecha = fecha_entry.get()
            concepto = concepto_entry.get()
            importe = importe_entry.get()
            
            test_data = [caja, fecha, concepto, importe]
            
            # Get pattern to test
            pattern = self.patterns[self.current_pattern_index]
            
            # Create JavaScript test file
            test_js = f"""
// Test data
const data = {json.dumps(test_data)};

// Matcher function
const matcherFunction = {pattern['matcherFunction']};

// Generator function
const generatorFunction = {pattern['generatorFunction']};

// Helper functions
function formatearFecha(fecha) {{
    return fecha;  // Simplified for test
}}

function obtenerMes(fecha) {{
    const date = new Date(fecha);
    return ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", 
           "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"][date.getMonth()];
}}

// Mock environment variables
const conceptPattern = /Pie Ayunt./i;  // Example pattern
const caja = "{caja}";
const fecha = "{fecha}";
const importe = "{importe}";
const outputData = {{
    "liquido_operaciones": 100,
    "operaciones": [{{
        "detalle": {{
            "fecha": "2024-05-30",
            "caja": "BBVA",
            "final": [{{ "partida": "42000", "IMPORTE_PARTIDA": 50 }}],
            "aplicaciones": [{{ "importe": 100 }}]
        }}
    }}]
}};

// Run the test
let matchResult;
try {{
    matchResult = matcherFunction(data);
}} catch (e) {{
    matchResult = "ERROR: " + e.message;
}}

let generatorResult = null;
if (matchResult === true) {{
    try {{
        generatorResult = generatorFunction(data);
    }} catch (e) {{
        generatorResult = "ERROR: " + e.message;
    }}
}}

// Output the results
console.log(JSON.stringify({{
    matchResult: matchResult,
    generatorResult: generatorResult
}}, null, 2));
"""
            # Display the code
            code_text.delete(1.0, tk.END)
            code_text.insert(tk.END, test_js)
            
            # If Node.js is available, run the actual test
            if self.node_available:
                try:
                    # Create temporary JS file
                    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as temp_file:
                        temp_file_path = temp_file.name
                        temp_file.write(test_js)
                    
                    # Run with Node.js
                    result = subprocess.run(
                        ["node", temp_file_path], 
                        stdout=subprocess.PIPE, 
                        stderr=subprocess.PIPE, 
                        text=True,
                        check=True
                    )
                    
                    # Parse and display result
                    result_text.delete(1.0, tk.END)
                    
                    # Try to parse JSON output for pretty formatting
                    try:
                        json_result = json.loads(result.stdout)
                        result_text.insert(tk.END, "Match Result: ")
                        
                        if isinstance(json_result.get("matchResult"), bool):
                            status = "✅ MATCH" if json_result["matchResult"] else "❌ NO MATCH"
                            result_text.insert(tk.END, f"{status}\n\n")
                        else:
                            result_text.insert(tk.END, f"{json_result['matchResult']}\n\n")
                            
                        if json_result.get("generatorResult"):
                            result_text.insert(tk.END, "Generator Output:\n")
                            
                            # Format the generator output nicely
                            formatted_output = json.dumps(json_result["generatorResult"], indent=2)
                            result_text.insert(tk.END, formatted_output)
                        elif json_result.get("matchResult") is True:
                            result_text.insert(tk.END, "Generator function did not produce output.")
                    except json.JSONDecodeError:
                        # Plain text output
                        result_text.insert(tk.END, result.stdout)
                        
                    # Show any errors
                    if result.stderr:
                        result_text.insert(tk.END, "\n\nErrors:\n")
                        result_text.insert(tk.END, result.stderr)
                        
                    # Clean up temp file
                    try:
                        os.unlink(temp_file_path)
                    except:
                        pass
                        
                except Exception as e:
                    result_text.delete(1.0, tk.END)
                    result_text.insert(tk.END, f"Error running test: {str(e)}")
            else:
                # Node.js not available - show instructions
                result_text.delete(1.0, tk.END)
                result_text.insert(tk.END, "JavaScript engine (Node.js) not available for executing the test.\n\n")
                result_text.insert(tk.END, "To test this pattern, please:\n")
                result_text.insert(tk.END, "1. Install Node.js from https://nodejs.org/\n")
                result_text.insert(tk.END, "2. Restart this application\n\n")
                result_text.insert(tk.END, "Alternatively, you can copy the JavaScript code from the 'JavaScript Code' tab and run it manually in a JavaScript environment.")
        
        # Button area
        test_button = ttk.Button(
            bottom_frame, 
            text="Execute Test" if self.node_available else "Execute Test (Node.js not found)",
            command=execute_test
        )
        test_button.pack(side=tk.RIGHT, padx=5)
        
        close_button = ttk.Button(bottom_frame, text="Close", command=test_window.destroy)
        close_button.pack(side=tk.RIGHT, padx=5)
        
        # Run initial test automatically
        execute_test()
    
    def show_about(self):
        """Display about dialog with information about the application"""
        about_window = tk.Toplevel(self.root)
        about_window.title("About Transaction Pattern Editor")
        about_window.geometry("400x300")
        about_window.transient(self.root)
        about_window.grab_set()
        
        about_frame = ttk.Frame(about_window, padding="20")
        about_frame.pack(fill=tk.BOTH, expand=True)
        
        # Title and version
        ttk.Label(about_frame, text="Transaction Pattern Editor", font=("Arial", 14, "bold")).pack(pady=(0, 5))
        ttk.Label(about_frame, text="Version 1.1").pack(pady=(0, 15))
        
        # Description
        description = (
            "This tool allows you to edit and test transaction pattern matching and "
            "generation rules stored in JSON format. The patterns are defined as "
            "JavaScript functions for matching transactions and generating outputs."
        )
        desc_label = ttk.Label(about_frame, text=description, wraplength=350, justify="center")
        desc_label.pack(pady=(0, 15))
        
        # Requirements
        reqs_frame = ttk.LabelFrame(about_frame, text="Requirements")
        reqs_frame.pack(fill=tk.X, pady=(0, 15))
        
        ttk.Label(reqs_frame, text="• Python 3.6+").pack(anchor="w", padx=10)
        ttk.Label(reqs_frame, text="• Node.js (for testing)").pack(anchor="w", padx=10)
        
        # Close button
        ttk.Button(about_frame, text="Close", command=about_window.destroy).pack()


def main():
    root = tk.Tk()
    app = TransactionPatternEditor(root)
    root.mainloop()

if __name__ == "__main__":
    main()
