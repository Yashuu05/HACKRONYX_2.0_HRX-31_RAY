class utilities:

    def read_yaml_file(self, file_path:str):
        """
        - purpose: reads yaml file
        - input:
            1. file_path: path of file to read
        - output: None
        - returns: data (yaml file)
        """
        import yaml
        try:
            with open(file_path, mode="r", encoding="utf-8") as file:
                data = yaml.safe_load(file)
                return data 
        except Exception as e:
            return str(e)

    def read_csv(file_path):
        """
        - purpose: reads csv file
        - input:
            1. file_path: path of file to read
        - output: None
        - returns: data (csv file)
        """
        import pandas as pd
        try:
            with open(file_path, mode="r", encoding="utf-8") as file:
                data = pd.read_csv(file_path)
                return data 
        except Exception as e:
            return str(e)

    def read_excel(file_path):
            """
            - purpose: reads excel file
            - input:
                1. file_path: path of file to read
            - output: None
            - returns: data (excel file)
            """
            import pandas as pd
            try:
                with open(file_path, mode="r", encoding="utf-8") as file:
                    data = pd.read_excel(file_path)
                    return data 
            except Exception as e:
                return str(e)