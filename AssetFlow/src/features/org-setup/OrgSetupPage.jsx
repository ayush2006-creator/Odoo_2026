/**
 * OrgSetupPage — Screen 3 (Admin only).
 *
 * Three-tab layout: Departments | Categories | Employees.
 * Each tab renders its own table + CRUD dialogs.
 * The "+ Add …" button in the header changes label based on the active tab.
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BlurFade } from '@/components/ui/blur-fade';
import { PageHeader } from '@/components/shared/PageHeader';

import { DepartmentsTab } from './DepartmentsTab';
import { CategoriesTab } from './CategoriesTab';
import { EmployeesTab } from './EmployeesTab';

const TAB_ADD_LABELS = {
  departments: 'Department',
  categories: 'Category',
  employees: 'Employee',
};

export default function OrgSetupPage() {
  const [activeTab, setActiveTab] = useState('departments');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleAdd = () => {
    setAddDialogOpen(true);
  };

  return (
    <BlurFade delay={0.08} inView>
      <div className="space-y-6">
        <PageHeader
          title="Organization Setup"
          description="Manage departments, asset categories, and employees."
        >
          <Button size="sm" onClick={handleAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add {TAB_ADD_LABELS[activeTab]}
          </Button>
        </PageHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
          </TabsList>

          <TabsContent value="departments">
            <DepartmentsTab
              addDialogOpen={activeTab === 'departments' && addDialogOpen}
              onAddDialogClose={() => setAddDialogOpen(false)}
            />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesTab
              addDialogOpen={activeTab === 'categories' && addDialogOpen}
              onAddDialogClose={() => setAddDialogOpen(false)}
            />
          </TabsContent>

          <TabsContent value="employees">
            <EmployeesTab
              addDialogOpen={activeTab === 'employees' && addDialogOpen}
              onAddDialogClose={() => setAddDialogOpen(false)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </BlurFade>
  );
}
